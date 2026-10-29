import { publicCertificate } from "../utils/certificates.js";
import { recordPlayback, assertModuleRequirements } from "../lib/learning-integrity.js";
import { enrollmentScope } from "../lib/permissions.js";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sanitizeActivity } from "../services/course-access.service.js";
import {
  aggregateHierarchy,
  completeActivity,
  getStudentEnrollment,
  gradeAutomaticActivity,
  recordGrade,
  requireAccessibleProgress,
  startActivity
} from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

const automaticallyGradedTypes = [
  "QUESTIONS",
  "INCORRECT_SECTION",
  "FINAL_EXAM",
  "CASE_STUDY",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
  "FILL_BLANKS"
];

function validateAutomaticResponse(type, content, response) {
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(type)) {
    const questions = content?.questions ?? [];
    const answers = response?.answers;
    if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((answer) => !Number.isInteger(answer))) {
      throw new HttpError(400, "Responde todas las preguntas antes de enviar");
    }
  }
  if (type === "TRUE_FALSE") {
    const answers = response?.answers;
    if (!Array.isArray(answers) || answers.length !== (content?.statements ?? []).length || answers.some((answer) => typeof answer !== "boolean")) {
      throw new HttpError(400, "Responde verdadero o falso en todas las afirmaciones");
    }
  }
  if (type === "MATCHING") {
    const matches = response?.matches;
    if (!Array.isArray(matches) || matches.length !== (content?.pairs ?? []).length || matches.some((answer) => !Number.isInteger(answer))) {
      throw new HttpError(400, "Selecciona una correspondencia para cada concepto");
    }
  }
  if (type === "ORDERING") {
    const order = response?.order;
    const expectedLength = (content?.items ?? []).length;
    if (!Array.isArray(order) || order.length !== expectedLength || new Set(order).size !== expectedLength || order.some((item) => !Number.isInteger(item) || item < 0 || item >= expectedLength)) {
      throw new HttpError(400, "Incluye todos los elementos en un orden válido");
    }
  }
  if (type === "FILL_BLANKS") {
    const answers = response?.answers;
    if (!Array.isArray(answers) || answers.length !== (content?.sentences ?? []).length || answers.some((answer) => typeof answer !== "string" || !answer.trim())) {
      throw new HttpError(400, "Completa todos los espacios en blanco");
    }
  }
  if (type === "INCORRECT_SECTION") {
    const selected = response?.selectedIndices;
    const sectionCount = (content?.sections ?? []).length;
    if (!Array.isArray(selected) || new Set(selected).size !== selected.length || selected.some((item) => !Number.isInteger(item) || item < 0 || item >= sectionCount)) {
      throw new HttpError(400, "Selecciona las secciones con error de forma válida");
    }
  }
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId ?? req.user.id;
    if (!studentId) throw new HttpError(400, "Selecciona una persona participante");
    res.json({
      data: await prisma.courseProgress.findMany({
        where: { enrollment: { AND: [enrollmentScope(req.user), { studentId }] } },
        include: { enrollment: { include: { course: true } } },
        orderBy: { updatedAt: "desc" }
      })
    });
  })
);

router.get(
  "/courses/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const enrollment = await getStudentEnrollment(req.user.id, req.params.id);
    const [blocks, progress] = await prisma.$transaction([
      prisma.courseBlock.findMany({
        where: { courseId: req.params.id },
        orderBy: { order: "asc" },
        include: {
          topics: {
            orderBy: { order: "asc" },
            include: {
              activities: {
                orderBy: { order: "asc" },
                include: {
                  attempts: {
                    where: { studentId: req.user.id },
                    select: {
                      id: true,
                      attemptNumber: true,
                      score: true,
                      maxScore: true,
                      status: true,
                      response: true
                    },
                    orderBy: { attemptNumber: "desc" }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.activityProgress.findMany({ where: { enrollmentId: enrollment.id } })
    ]);
    const sanitized = blocks.map((block) => ({
      ...block,
      topics: block.topics.map((topic) => ({
        ...topic,
        activities: topic.activities.map((activity) => sanitizeActivity(activity, false))
      }))
    }));
    res.json({
      data: {
        enrollment: { ...enrollment, certificate: publicCertificate(enrollment.certificate) },
        blocks: aggregateHierarchy(sanitized, progress)
      }
    });
  })
);

router.post(
  "/activities/:id/start",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    res.json({ data: await startActivity(req.user.id, req.params.id) });
  })
);

router.post(
  "/activities/:id/reading",
  validate(idParamSchema, "params"),
  validate(z.object({ confirmed: z.literal(true) })),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    if (progress.activity.type !== "READING") throw new HttpError(400, "Esta no es una actividad de lectura");
    if (!progress.startedAt) throw new HttpError(409, "Inicia la actividad primero");
    const elapsed = Math.floor((Date.now() - progress.startedAt.getTime()) / 1000);
    if (elapsed < progress.activity.minimumReadSeconds) {
      throw new HttpError(
        409,
        `Todavía no se cumple el tiempo mínimo de lectura. Faltan ${progress.activity.minimumReadSeconds - elapsed} segundos.`
      );
    }
    await prisma.activityProgress.update({
      where: { id: progress.id },
      data: { confirmed: true, timeSpentSeconds: elapsed }
    });
    res.json({ data: await completeActivity(progress.id) });
  })
);

router.post(
  "/activities/:id/content",
  validate(idParamSchema, "params"),
  validate(z.object({ confirmed: z.literal(true) })),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    if (!["EXTERNAL_LINK", "EMBEDDED_CONTENT", "INTERACTIVE_CONTENT"].includes(progress.activity.type)) {
      throw new HttpError(400, "Esta actividad no permite confirmar la revisión del contenido");
    }
    res.json({ data: await completeActivity(progress.id) });
  })
);

// Each checkpoint is scoped to the authenticated participant and serialized per activity.
async function updateTracking(progressId, update) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ActivityProgress" WHERE id = ${progressId}::uuid FOR UPDATE`;
    const current = await tx.activityProgress.findUnique({ where: { id: progressId } });
    return tx.activityProgress.update({ where: { id: progressId }, data: update(current) });
  });
}
router.post("/activities/:id/module-start", validate(idParamSchema, "params"), validate(z.object({ moduleId: z.string().max(100) })), asyncHandler(async (req, res) => {
  const progress = await requireAccessibleProgress(req.user.id, req.params.id);
  const module = progress.activity.content?.modules?.find(item => item.id === req.body.moduleId);
  if (progress.activity.type !== "COMPOSITE" || !module) throw new HttpError(404, "No se encontró el módulo");
  const updated = await updateTracking(progress.id, current => {
    const states = current.moduleProgress ?? {};
    return { moduleProgress: { ...states, [module.id]: { ...states[module.id], startedAt: states[module.id]?.startedAt ?? new Date().toISOString() } } };
  });
  res.json({ data: updated.moduleProgress[module.id] });
}));
router.post("/activities/:id/playback", validate(idParamSchema, "params"), validate(z.object({ moduleId: z.string().max(100).optional(), position: z.number().finite().min(0), playing: z.boolean() })), asyncHandler(async (req, res) => {
  const progress = await requireAccessibleProgress(req.user.id, req.params.id);
  const module = req.body.moduleId ? progress.activity.content?.modules?.find(item => item.id === req.body.moduleId) : null;
  const video = module ?? progress.activity;
  if (video.type !== "YOUTUBE_VIDEO" || (req.body.moduleId && progress.activity.type !== "COMPOSITE")) throw new HttpError(400, "Esta actividad no es un video");
  const key = module?.id ?? "__video";
  const updated = await updateTracking(progress.id, current => {
    const states = current.moduleProgress ?? {};
    const state = recordPlayback(states[key] ?? (!module ? { watchedSeconds: current.watchedSeconds } : {}), req.body, video.content.durationSeconds);
    return { moduleProgress: { ...states, [key]: { ...states[key], ...state } }, ...(!module ? { watchedSeconds: state.watchedSeconds, videoDurationSeconds: video.content.durationSeconds } : {}) };
  });
  res.json({ data: updated.moduleProgress[key] });
}));

router.post(
  "/activities/:id/video",
  validate(idParamSchema, "params"),
  validate(
    z.object({
      watchedSeconds: z.number().min(0),
      durationSeconds: z.number().positive()
    })
  ),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    if (progress.activity.type !== "YOUTUBE_VIDEO") {
      throw new HttpError(400, "Esta no es una actividad de video");
    }
    const durationSeconds = progress.activity.content.durationSeconds;
    const watchedSeconds = progress.watchedSeconds;
    const watchPercent = watchedSeconds / durationSeconds * 100;
    if (watchPercent < progress.activity.minimumWatchPercent) {
      return res.json({
        data: { completed: false, watchPercent: Math.min(100, Math.round(watchPercent * 100) / 100) }
      });
    }
    await completeActivity(progress.id);
    res.json({ data: { completed: true, watchPercent: Math.min(100, watchPercent) } });
  })
);

router.post(
  "/activities/:id/composite",
  validate(idParamSchema, "params"),
  validate(z.object({ responses: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    const activity = progress.activity;
    if (activity.type !== "COMPOSITE") throw new HttpError(400, "Esta no es una actividad modular");

    const modules = activity.content?.modules ?? [];
    assertModuleRequirements(modules, progress.moduleProgress);
    const scoredModules = modules.filter((module) => automaticallyGradedTypes.includes(module.type));
    for (const module of scoredModules) {
      validateAutomaticResponse(module.type, module.content, req.body.responses[module.id]);
    }

    if (!scoredModules.length) {
      const attempts = await prisma.activityAttempt.count({ where: { enrollmentId: progress.enrollmentId, activityId: activity.id } });
      if (activity.maxAttempts && attempts >= activity.maxAttempts) throw new HttpError(409, "Alcanzaste el número máximo de intentos");
      const participationPoints = activity.points || 1;
      const attempt = await prisma.activityAttempt.create({
        data: { enrollmentId: progress.enrollmentId, activityId: activity.id, studentId: req.user.id, attemptNumber: attempts + 1, response: { modules: req.body.responses }, score: participationPoints, maxScore: participationPoints, status: "GRADED", gradedAt: new Date() },
        include: { activity: { include: { topic: { include: { block: true } } } } }
      });
      await recordGrade(attempt, participationPoints, participationPoints);
      await completeActivity(progress.id);
      return res.status(201).json({ data: attempt });
    }

    const attempts = await prisma.activityAttempt.count({
      where: { enrollmentId: progress.enrollmentId, activityId: activity.id }
    });
    if (activity.maxAttempts && attempts >= activity.maxAttempts) {
      throw new HttpError(409, "Alcanzaste el número máximo de intentos");
    }
    const response = { modules: req.body.responses };
    const { score, maxScore } = gradeAutomaticActivity(activity, response);
    const attempt = await prisma.activityAttempt.create({
      data: {
        enrollmentId: progress.enrollmentId,
        activityId: activity.id,
        studentId: req.user.id,
        attemptNumber: attempts + 1,
        response,
        score,
        maxScore,
        status: "GRADED",
        gradedAt: new Date()
      },
      include: {
        activity: { include: { topic: { include: { block: true } } } }
      }
    });
    await recordGrade(attempt, score, maxScore);
    await completeActivity(progress.id);
    res.status(201).json({ data: attempt });
  })
);

router.post(
  "/activities/:id/attempts",
  validate(idParamSchema, "params"),
  validate(z.object({ response: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    const activity = progress.activity;
    if (![
      "QUESTIONS",
      "INCORRECT_SECTION",
      "ASSIGNMENT",
      "FINAL_EXAM",
      "CASE_STUDY",
      "TRUE_FALSE",
      "MATCHING",
      "ORDERING",
      "FILL_BLANKS"
    ].includes(activity.type)) {
      throw new HttpError(400, "Esta actividad no acepta respuestas");
    }
    const attempts = await prisma.activityAttempt.count({
      where: { enrollmentId: progress.enrollmentId, activityId: activity.id }
    });
    if (activity.maxAttempts && attempts >= activity.maxAttempts) {
      throw new HttpError(409, "Alcanzaste el número máximo de intentos");
    }
    const pendingReview = activity.type === "ASSIGNMENT";
    if (pendingReview) {
      const requiredFields = (activity.content?.fields ?? []).filter((field) => field.required);
      const missing = requiredFields.find(
        (field) =>
          req.body.response[field.label] === undefined ||
          req.body.response[field.label] === null ||
          String(req.body.response[field.label]).trim() === ""
      );
      if (missing) throw new HttpError(400, `Falta un campo obligatorio de la tarea: ${missing.label}`);
    }
    if (automaticallyGradedTypes.includes(activity.type)) {
      validateAutomaticResponse(activity.type, activity.content, req.body.response);
    }
    const attempt = await prisma.activityAttempt.create({
      data: {
        enrollmentId: progress.enrollmentId,
        activityId: activity.id,
        studentId: req.user.id,
        attemptNumber: attempts + 1,
        response: req.body.response,
        status: pendingReview ? "PENDING_REVIEW" : "GRADED",
        gradedAt: pendingReview ? null : new Date()
      },
      include: {
        activity: { include: { topic: { include: { block: true } } } }
      }
    });

    if (pendingReview) {
      await prisma.activityProgress.update({
        where: { id: progress.id },
        data: { status: "PENDING_REVIEW", startedAt: progress.startedAt ?? new Date() }
      });
      return res.status(201).json({ data: attempt });
    }

    const { score, maxScore } = gradeAutomaticActivity(activity, req.body.response);
    const updatedAttempt = await prisma.activityAttempt.update({
      where: { id: attempt.id },
      data: { score, maxScore }
    });
    await recordGrade(attempt, score, maxScore);
    await completeActivity(progress.id);
    res.status(201).json({ data: updatedAttempt });
  })
);

export default router;
