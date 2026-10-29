import { courseScope, enrollmentScope, userScope } from "../lib/permissions.js";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const courseWhere = courseScope(req.user);
    const enrollmentWhere = enrollmentScope(req.user);
    const [users, courses, publishedCourses, enrollments, completed, pendingReviews, certificates] =
      await Promise.all([
        prisma.user.count({ where: userScope(req.user) }),
        prisma.course.count({ where: courseWhere }),
        prisma.course.count({ where: { ...courseWhere, status: "PUBLISHED" } }),
        prisma.enrollment.count({ where: enrollmentWhere }),
        prisma.enrollment.count({ where: { ...enrollmentWhere, status: "COMPLETED" } }),
        prisma.activityAttempt.count({ where: { status: "PENDING_REVIEW", enrollment: enrollmentWhere } }),
        prisma.certificate.count({ where: { enrollment: enrollmentWhere } })
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
