import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { COURSE_EDITOR_ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { assertCourseEditor } from "../services/course-access.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
const activityTypes = [
  "COMPOSITE",
  "YOUTUBE_VIDEO",
  "READING",
  "EXTERNAL_LINK",
  "EMBEDDED_CONTENT",
  "CASE_STUDY",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
  "FILL_BLANKS",
  "INTERACTIVE_CONTENT",
  "QUESTIONS",
  "INCORRECT_SECTION",
  "ASSIGNMENT",
  "FINAL_EXAM"
];
const compositeModuleTypes = [
  "IMAGE",
  "YOUTUBE_VIDEO",
  "READING",
  "EXTERNAL_LINK",
  "EMBEDDED_CONTENT",
  "CASE_STUDY",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
  "FILL_BLANKS",
  "INTERACTIVE_CONTENT",
  "QUESTIONS",
  "INCORRECT_SECTION"
];
const input = z.object({
  topicId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  instructions: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(activityTypes),
  content: z.record(z.unknown()),
  points: z.coerce.number().min(0).default(0),
  minimumReadSeconds: z.coerce.number().int().min(0).default(0),
  minimumWatchPercent: z.coerce.number().min(1).max(100).default(80),
  maxAttempts: z.coerce.number().int().min(1).nullable().optional()
});

const contentSchemas = {
    IMAGE: z.object({
      url: z.string().min(1).max(500),
      alt: z.string().trim().min(2).max(200),
      caption: z.string().trim().max(500).optional().default("")
    }),
    YOUTUBE_VIDEO: z.object({
      url: z.string().url(),
      durationSeconds: z.number().positive()
    }),
    READING: z.object({ body: z.string().min(20) }),
    EXTERNAL_LINK: z.object({
      url: z.string().url(),
      label: z.string().min(2).max(160),
      description: z.string().max(1000).optional()
    }),
    EMBEDDED_CONTENT: z.object({
      url: z.string().url(),
      title: z.string().min(2).max(160),
      height: z.number().int().min(240).max(1200).default(520)
    }),
    INTERACTIVE_CONTENT: z.object({
      layout: z.enum(["ACCORDION", "TABS", "CARDS"]),
      items: z.array(
        z.object({ title: z.string().min(1).max(160), body: z.string().min(1).max(5000) })
      ).min(2).max(30)
    }),
    QUESTIONS: z.object({
      questions: z.array(
        z.object({
          prompt: z.string().min(3),
          options: z.array(z.string().min(1)).min(2),
          correctIndex: z.number().int().min(0),
          points: z.number().positive().default(1)
        })
      ).min(1)
    }),
    FINAL_EXAM: z.object({
      questions: z.array(
        z.object({
          prompt: z.string().min(3),
          options: z.array(z.string().min(1)).min(2),
          correctIndex: z.number().int().min(0),
          points: z.number().positive().default(1)
        })
      ).min(1)
    }),
    CASE_STUDY: z.object({
      scenario: z.string().min(20).max(10000),
      questions: z.array(
        z.object({
          prompt: z.string().min(3),
          options: z.array(z.string().min(1)).min(2),
          correctIndex: z.number().int().min(0),
          points: z.number().positive().default(1)
        })
      ).min(1)
    }),
    TRUE_FALSE: z.object({
      statements: z.array(
        z.object({
          prompt: z.string().min(3),
          correctAnswer: z.boolean(),
          points: z.number().positive().default(1)
        })
      ).min(1)
    }),
    MATCHING: z.object({
      pairs: z.array(
        z.object({ left: z.string().min(1), right: z.string().min(1) })
      ).min(2)
    }),
    ORDERING: z.object({ items: z.array(z.string().min(1)).min(2) }),
    FILL_BLANKS: z.object({
      sentences: z.array(
        z.object({
          prompt: z.string().min(3),
          answer: z.string().min(1),
          caseSensitive: z.boolean().default(false),
          points: z.number().positive().default(1)
        })
      ).min(1)
    }),
    INCORRECT_SECTION: z.object({
      sections: z.array(
        z.object({ text: z.string().min(1), incorrect: z.boolean() })
      ).min(2)
    }),
    ASSIGNMENT: z.object({
      fields: z.array(
        z.object({
          label: z.string().min(2),
          type: z.enum(["text", "textarea", "number"]),
          required: z.boolean().default(true)
        })
      ).min(1)
    })
};

function validateContent(type, content) {
  if (type === "COMPOSITE") {
    const compositeResult = z.object({
      modules: z.array(z.object({
        id: z.string().min(1).max(100),
        type: z.enum(compositeModuleTypes),
        title: z.string().trim().max(180).optional().default(""),
        content: z.record(z.unknown()),
        minimumReadSeconds: z.number().int().min(0).optional().default(0),
        minimumWatchPercent: z.number().min(1).max(100).optional().default(80)
      })).min(1).max(100)
    }).safeParse(content);
    if (!compositeResult.success) {
      throw new HttpError(400, "El contenido de la actividad modular no es válido", compositeResult.error.flatten());
    }
    const seenIds = new Set();
    const modules = compositeResult.data.modules.map((module) => {
      if (seenIds.has(module.id)) throw new HttpError(400, "Cada bloque de contenido debe tener un identificador único");
      seenIds.add(module.id);
      const moduleResult = contentSchemas[module.type].safeParse(module.content);
      if (!moduleResult.success) {
        throw new HttpError(400, "El contenido de uno de los bloques no es válido", moduleResult.error.flatten());
      }
      return { ...module, content: moduleResult.data };
    });
    return { modules };
  }

  const result = contentSchemas[type].safeParse(content);
  if (!result.success) throw new HttpError(400, "El contenido de la actividad no es válido", result.error.flatten());
  return result.data;
}

async function getTopicCourse(topicId) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { block: true }
  });
  if (!topic) throw new HttpError(404, "No se encontró la lección");
  return topic;
}

router.use(requireAuth, allowRoles(...COURSE_EDITOR_ROLES));

router.get(
  "/",
  validate(z.object({ topicId: z.string().uuid() }), "query"),
  asyncHandler(async (req, res) => {
    const topic = await getTopicCourse(req.validatedQuery.topicId);
    await assertCourseEditor(req.user, topic.block.courseId);
    res.json({
      data: await prisma.activity.findMany({
        where: { topicId: topic.id },
        orderBy: { order: "asc" }
      })
    });
  })
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { topic: { include: { block: true } } }
    });
    if (!activity) throw new HttpError(404, "No se encontró la actividad");
    await assertCourseEditor(req.user, activity.topic.block.courseId);
    res.json({ data: activity });
  })
);

router.post(
  "/",
  validate(input),
  asyncHandler(async (req, res) => {
    const topic = await getTopicCourse(req.body.topicId);
    await assertCourseEditor(req.user, topic.block.courseId);
    const enrollments = await prisma.enrollment.count({ where: { courseId: topic.block.courseId } });
    if (enrollments) throw new HttpError(409, "No se puede cambiar la estructura de un curso que ya tiene inscripciones");
    const content = validateContent(req.body.type, req.body.content);
    const order = (await prisma.activity.count({ where: { topicId: topic.id } })) + 1;
    res.status(201).json({
      data: await prisma.activity.create({ data: { ...req.body, content, order } })
    });
  })
);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(input.omit({ topicId: true }).partial()),
  asyncHandler(async (req, res) => {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { topic: { include: { block: true } } }
    });
    if (!activity) throw new HttpError(404, "No se encontró la actividad");
    await assertCourseEditor(req.user, activity.topic.block.courseId);
    const type = req.body.type ?? activity.type;
    const content = req.body.content
      ? validateContent(type, req.body.content)
      : undefined;
    res.json({
      data: await prisma.activity.update({
        where: { id: activity.id },
        data: { ...req.body, content }
      })
    });
  })
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { topic: { include: { block: true } } }
    });
    if (!activity) throw new HttpError(404, "No se encontró la actividad");
    await assertCourseEditor(req.user, activity.topic.block.courseId);
    const enrollments = await prisma.enrollment.count({
      where: { courseId: activity.topic.block.courseId }
    });
    if (enrollments) throw new HttpError(409, "No se puede cambiar la estructura de un curso que ya tiene inscripciones");
    await prisma.activity.delete({ where: { id: activity.id } });
    res.status(204).send();
  })
);

export default router;
