import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { ROLES } from "../lib/roles.js";
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

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const studentId =
      req.user.role.name === ROLES.STUDENT ? req.user.id : req.query.studentId;
    if (!studentId) throw new HttpError(400, "studentId is required");
    res.json({
      data: await prisma.courseProgress.findMany({
        where: { enrollment: { studentId } },
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
                      status: true
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
        enrollment,
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
    if (progress.activity.type !== "READING") throw new HttpError(400, "Not a reading activity");
    if (!progress.startedAt) throw new HttpError(409, "Start the activity first");
    const elapsed = Math.floor((Date.now() - progress.startedAt.getTime()) / 1000);
    if (elapsed < progress.activity.minimumReadSeconds) {
      throw new HttpError(
        409,
        `Minimum reading time not met. ${progress.activity.minimumReadSeconds - elapsed} seconds remain.`
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
      throw new HttpError(400, "Not a video activity");
    }
    const startedAt = progress.startedAt ?? new Date();
    const elapsedSeconds = Math.max(0, (Date.now() - startedAt.getTime()) / 1000);
    const reportedSeconds = Math.min(req.body.watchedSeconds, elapsedSeconds + 2);
    const watchedSeconds = Math.max(progress.watchedSeconds, reportedSeconds);
    const watchPercent = (watchedSeconds / req.body.durationSeconds) * 100;
    await prisma.activityProgress.update({
      where: { id: progress.id },
      data: {
        status: "IN_PROGRESS",
        startedAt,
        watchedSeconds,
        videoDurationSeconds: req.body.durationSeconds,
        timeSpentSeconds: Math.floor(watchedSeconds)
      }
    });
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
  "/activities/:id/attempts",
  validate(idParamSchema, "params"),
  validate(z.object({ response: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const progress = await requireAccessibleProgress(req.user.id, req.params.id);
    const activity = progress.activity;
    if (!["QUESTIONS", "INCORRECT_SECTION", "ASSIGNMENT", "FINAL_EXAM"].includes(activity.type)) {
      throw new HttpError(400, "This activity does not accept submissions");
    }
    const attempts = await prisma.activityAttempt.count({
      where: { enrollmentId: progress.enrollmentId, activityId: activity.id }
    });
    if (activity.maxAttempts && attempts >= activity.maxAttempts) {
      throw new HttpError(409, "Maximum attempts reached");
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
      if (missing) throw new HttpError(400, `Required assignment field missing: ${missing.label}`);
    }
    if (["QUESTIONS", "FINAL_EXAM"].includes(activity.type)) {
      const questions = activity.content?.questions ?? [];
      const answers = req.body.response?.answers;
      if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((answer) => !Number.isInteger(answer))) {
        throw new HttpError(400, "Every question must have a submitted answer");
      }
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
