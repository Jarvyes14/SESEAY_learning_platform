import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getOrderedActivities, initializeEnrollment } from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = req.query.mine === "true"
      ? { studentId: req.user.id }
      : req.user.role.name === ROLES.STUDENT
        ? { studentId: req.user.id }
        : req.user.role.name === ROLES.INSTRUCTOR
          ? { course: { instructorId: req.user.id } }
          : req.user.role.name === ROLES.ORGANIZATION_ADMIN
            ? { organizationId: req.user.organizationId }
            : {};
    res.json({
      data: await prisma.enrollment.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: true,
          courseProgress: true,
          certificate: true
        },
        orderBy: { updatedAt: "desc" }
      })
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
    if (
      studentId !== req.user.id &&
      !ADMIN_ROLES.includes(req.user.role.name) &&
      req.user.role.name !== ROLES.INSTRUCTOR
    ) {
      throw new HttpError(403, "Not authorized");
    }
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { role: true }
    });
    if (!student?.isActive) throw new HttpError(400, "An active user account is required");
    if (
      studentId !== req.user.id &&
      req.user.role.name === ROLES.ORGANIZATION_ADMIN &&
      student.organizationId !== req.user.organizationId
    ) {
      throw new HttpError(403, "The user is outside your organization");
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
    if (!enrollment) throw new HttpError(404, "Enrollment not found");

    const canReset =
      ADMIN_ROLES.includes(req.user.role.name) ||
      (req.user.role.name === ROLES.INSTRUCTOR && enrollment.course.instructorId === req.user.id);
    if (!canReset) throw new HttpError(403, "Not authorized to reset this progress");
    if (
      req.user.role.name === ROLES.ORGANIZATION_ADMIN &&
      enrollment.organizationId !== req.user.organizationId
    ) {
      throw new HttpError(403, "The enrollment is outside your organization");
    }

    const activities = await getOrderedActivities(enrollment.courseId);
    if (!activities.length) throw new HttpError(409, "This course has no activities");

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
    const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
    if (!enrollment) throw new HttpError(404, "Enrollment not found");
    if (
      req.user.role.name === ROLES.STUDENT &&
      enrollment.studentId !== req.user.id
    ) {
      throw new HttpError(403, "Not authorized");
    }
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "WITHDRAWN" }
    });
    res.status(204).send();
  })
);

export default router;
