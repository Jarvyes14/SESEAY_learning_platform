import { enrollmentScope } from "../lib/permissions.js";
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
import {
  completeActivity,
  recordGrade
} from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = { enrollment: enrollmentScope(req.user) };
    res.json({
      data: await prisma.grade.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { title: true } },
          activity: { select: { title: true, type: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    });
  })
);

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const where = enrollmentScope(req.user);

    const data = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, passingGrade: true } },
        courseProgress: {
          select: { completionPercent: true, finalGrade: true, passed: true, completedAt: true }
        },
        grades: {
          include: { activity: { select: { id: true, title: true, type: true } } },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { enrolledAt: "desc" }
    });

    res.json({ data });
  })
);

router.get(
  "/pending",
  allowRoles(...COURSE_EDITOR_ROLES),
  asyncHandler(async (req, res) => {
    const where = {
      status: "PENDING_REVIEW",
      enrollment: enrollmentScope(req.user)
    };
    res.json({
      data: await prisma.activityAttempt.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, email: true } },
          activity: {
            include: { topic: { include: { block: { include: { course: true } } } } }
          }
        },
        orderBy: { submittedAt: "asc" }
      })
    });
  })
);

router.patch(
  "/attempts/:id/review",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  validate(
    z.object({
      score: z.number().min(0),
      feedback: z.string().trim().max(3000).optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const attempt = await prisma.activityAttempt.findUnique({
      where: { id: req.params.id },
      include: {
        activity: { include: { topic: { include: { block: true } } } }
      }
    });
    if (!attempt) throw new HttpError(404, "No se encontró el intento");
    if (attempt.status !== "PENDING_REVIEW") {
      throw new HttpError(409, "El intento no está pendiente de revisión");
    }
    await assertCourseEditor(req.user, attempt.activity.topic.block.courseId);
    const maxScore = attempt.activity.points || 100;
    if (req.body.score > maxScore) {
      throw new HttpError(400, `La calificación no puede superar ${maxScore}`);
    }
    const updated = await prisma.activityAttempt.update({
      where: { id: attempt.id },
      data: {
        score: req.body.score,
        maxScore,
        feedback: req.body.feedback,
        status: "GRADED",
        gradedAt: new Date(),
        reviewedById: req.user.id
      }
    });
    await recordGrade(attempt, req.body.score, maxScore, req.user.id);
    const progress = await prisma.activityProgress.findUnique({
      where: {
        enrollmentId_activityId: {
          enrollmentId: attempt.enrollmentId,
          activityId: attempt.activityId
        }
      }
    });
    await completeActivity(progress.id);
    res.json({ data: updated });
  })
);

export default router;
