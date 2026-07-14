import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initializeEnrollment } from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where =
      req.user.role.name === ROLES.STUDENT
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
    const studentId =
      req.user.role.name === ROLES.STUDENT ? req.user.id : req.body.studentId;
    if (!studentId) throw new HttpError(400, "studentId is required");
    if (
      req.user.role.name !== ROLES.STUDENT &&
      !ADMIN_ROLES.includes(req.user.role.name) &&
      req.user.role.name !== ROLES.INSTRUCTOR
    ) {
      throw new HttpError(403, "Not authorized");
    }
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { role: true }
    });
    if (!student || student.role.name !== ROLES.STUDENT) {
      throw new HttpError(400, "A valid student account is required");
    }
    const enrollment = await initializeEnrollment(student, req.body.courseId);
    res.status(201).json({ data: enrollment });
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

