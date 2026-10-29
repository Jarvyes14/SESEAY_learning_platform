import { publicCertificate } from "../utils/certificates.js";
import { enrollmentScope, canAccessEnrollment, canAccessUser, scopeFor, requirePermission } from "../lib/permissions.js";
import { assertCourseEditor } from "../services/course-access.service.js";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getOrderedActivities, initializeEnrollment } from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = req.query.mine === "true" ? { studentId: req.user.id } : enrollmentScope(req.user);
    res.json({
      data: (await prisma.enrollment.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: true,
          courseProgress: true,
          certificate: true
        },
        orderBy: { updatedAt: "desc" }
      })).map(enrollment => ({ ...enrollment, certificate: publicCertificate(enrollment.certificate) }))
    });
  })
);

router.post(
  "/",
  validate(
    z.object({
      courseId: z.string().uuid(),
      studentId: z.string().uuid().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const studentId = req.body.studentId ?? req.user.id;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { role: true }
    });
    if (!student?.isActive) throw new HttpError(400, "Se requiere una cuenta de usuario activa");
    if (studentId !== req.user.id) {
      requirePermission(req.user, "enrollments.manage");
      await assertCourseEditor(req.user, req.body.courseId);
      if (scopeFor(req.user) === "ORGANIZATION" && !canAccessUser(req.user, student)) throw new HttpError(403, "La cuenta esta fuera de tu organización");
    }
    const enrollment = await initializeEnrollment(student, req.body.courseId);
    res.status(201).json({ data: enrollment });
  })
);

router.post(
  "/:id/reset-progress",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: { course: true }
    });
    if (!enrollment) throw new HttpError(404, "No se encontró la inscripción");

    if (!canAccessEnrollment(req.user, enrollment)) throw new HttpError(403, "La inscripcion esta fuera de tu alcance");
    const activities = await getOrderedActivities(enrollment.courseId);
    if (!activities.length) throw new HttpError(409, "Este curso no tiene actividades");

    await prisma.$transaction(async (tx) => {
      await tx.certificate.deleteMany({ where: { enrollmentId: enrollment.id } });
      await tx.grade.deleteMany({ where: { enrollmentId: enrollment.id } });
      await tx.activityAttempt.deleteMany({ where: { enrollmentId: enrollment.id } });
      await tx.activityProgress.deleteMany({ where: { enrollmentId: enrollment.id } });
      await tx.courseProgress.deleteMany({ where: { enrollmentId: enrollment.id } });
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "ACTIVE", completedAt: null }
      });
      await tx.courseProgress.create({ data: { enrollmentId: enrollment.id } });
      await tx.activityProgress.createMany({
        data: activities.map((activity, index) => ({
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          activityId: activity.id,
          status: index === 0 ? "AVAILABLE" : "LOCKED"
        }))
      });
    });

    const resetEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollment.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: true,
        courseProgress: true,
        certificate: true
      }
    });
    res.json({ data: resetEnrollment });
  })
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id }, include: { course: true } });
    if (enrollment.studentId === req.user.id) requirePermission(req.user, "learning.enroll");
    else {
      requirePermission(req.user, "enrollments.manage");
      if (!canAccessEnrollment(req.user, enrollment)) throw new HttpError(403, "La inscripcion esta fuera de tu alcance");
    }
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "WITHDRAWN" }
    });
    res.status(204).send();
  })
);

export default router;
