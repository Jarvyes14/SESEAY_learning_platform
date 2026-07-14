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
  "YOUTUBE_VIDEO",
  "READING",
  "QUESTIONS",
  "INCORRECT_SECTION",
  "ASSIGNMENT",
  "FINAL_EXAM"
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

function validateContent(type, content) {
  const schemas = {
    YOUTUBE_VIDEO: z.object({
      url: z.string().url(),
      durationSeconds: z.number().positive()
    }),
    READING: z.object({ body: z.string().min(20) }),
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
  const result = schemas[type].safeParse(content);
  if (!result.success) throw new HttpError(400, "Invalid activity content", result.error.flatten());
  return result.data;
}

async function getTopicCourse(topicId) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { block: true }
  });
  if (!topic) throw new HttpError(404, "Topic not found");
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
    if (!activity) throw new HttpError(404, "Activity not found");
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
    if (enrollments) throw new HttpError(409, "Course structure cannot change after enrollment");
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
    if (!activity) throw new HttpError(404, "Activity not found");
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
    if (!activity) throw new HttpError(404, "Activity not found");
    await assertCourseEditor(req.user, activity.topic.block.courseId);
    const enrollments = await prisma.enrollment.count({
      where: { courseId: activity.topic.block.courseId }
    });
    if (enrollments) throw new HttpError(409, "Course structure cannot change after enrollment");
    await prisma.activity.delete({ where: { id: activity.id } });
    res.status(204).send();
  })
);

export default router;
