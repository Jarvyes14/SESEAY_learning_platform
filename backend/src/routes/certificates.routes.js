import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { COURSE_EDITOR_ROLES, PLATFORM_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { assertCourseEditor } from "../services/course-access.service.js";
import { recalculateEnrollment } from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();

router.get(
  "/verify/:certificateId",
  asyncHandler(async (req, res) => {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId: req.params.certificateId }
    });
    if (!certificate || certificate.revokedAt) {
      throw new HttpError(404, "Valid certificate not found");
    }
    res.json({ data: certificate });
  })
);

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
      data: await prisma.certificate.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { title: true } }
        },
        orderBy: { issuedAt: "desc" }
      })
    });
  })
);

router.post(
  "/enrollments/:id/issue",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id }
    });
    if (!enrollment) throw new HttpError(404, "Enrollment not found");
    await assertCourseEditor(req.user, enrollment.courseId);
    await recalculateEnrollment(enrollment.id);
    const certificate = await prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.id }
    });
    if (!certificate) {
      throw new HttpError(409, "Completion, passing grade, or certificate requirements are not met");
    }
    res.status(201).json({ data: certificate });
  })
);

router.delete(
  "/:id",
  allowRoles(...PLATFORM_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    await prisma.certificate.update({
      where: { id: req.params.id },
      data: { revokedAt: new Date() }
    });
    res.status(204).send();
  })
);

export default router;
