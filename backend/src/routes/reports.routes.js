import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const role = req.user.role.name;
    const courseWhere =
      role === ROLES.INSTRUCTOR
        ? { instructorId: req.user.id }
        : role === ROLES.ORGANIZATION_ADMIN
          ? { organizationId: req.user.organizationId }
          : {};
    const enrollmentWhere =
      role === ROLES.INSTRUCTOR
        ? { course: { instructorId: req.user.id } }
        : role === ROLES.ORGANIZATION_ADMIN
          ? { organizationId: req.user.organizationId }
          : role === ROLES.STUDENT
            ? { studentId: req.user.id }
            : {};

    const [users, courses, publishedCourses, enrollments, completed, pendingReviews, certificates] =
      await Promise.all([
        ADMIN_ROLES.includes(role)
          ? prisma.user.count({
              where:
                role === ROLES.ORGANIZATION_ADMIN
                  ? { organizationId: req.user.organizationId }
                  : {}
            })
          : Promise.resolve(0),
        prisma.course.count({ where: courseWhere }),
        prisma.course.count({ where: { ...courseWhere, status: "PUBLISHED" } }),
        prisma.enrollment.count({ where: enrollmentWhere }),
        prisma.enrollment.count({ where: { ...enrollmentWhere, status: "COMPLETED" } }),
        role === ROLES.STUDENT
          ? Promise.resolve(0)
          : prisma.activityAttempt.count({
              where: {
                status: "PENDING_REVIEW",
                ...(role === ROLES.INSTRUCTOR
                  ? { activity: { topic: { block: { course: { instructorId: req.user.id } } } } }
                  : {})
              }
            }),
        prisma.certificate.count({
          where:
            role === ROLES.STUDENT
              ? { studentId: req.user.id }
              : role === ROLES.INSTRUCTOR
                ? { course: { instructorId: req.user.id } }
                : {}
        })
      ]);

    res.json({
      data: {
        users,
        courses,
        publishedCourses,
        enrollments,
        completed,
        pendingReviews,
        certificates,
        completionRate: enrollments ? Math.round((completed / enrollments) * 10000) / 100 : 0
      }
    });
  })
);

export default router;
