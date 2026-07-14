import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { COURSE_EDITOR_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import {
  assertCourseEditor,
  sanitizeActivity
} from "../services/course-access.service.js";
import { idParamSchema, paginationSchema } from "../validation/common.js";

const router = Router();
const difficulty = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const statuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const courseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10),
  category: z.string().trim().min(2).max(100),
  difficulty: z.enum(difficulty),
  durationMinutes: z.coerce.number().int().min(1),
  passingGrade: z.coerce.number().min(0).max(100),
  status: z.enum(statuses).default("DRAFT"),
  certificateEnabled: z.boolean().default(false),
  instructorId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional()
});

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

router.use(requireAuth);

router.get(
  "/",
  validate(
    paginationSchema.extend({
      status: z.enum(statuses).optional(),
      instructorId: z.string().uuid().optional()
    }),
    "query"
  ),
  asyncHandler(async (req, res) => {
    const { page, limit, search, status, instructorId } = req.validatedQuery;
    const role = req.user.role.name;
    const where = {
      ...(role === ROLES.STUDENT ? { status: "PUBLISHED" } : {}),
      ...(role === ROLES.INSTRUCTOR ? { instructorId: req.user.id } : {}),
      ...(role === ROLES.ORGANIZATION_ADMIN
        ? { organizationId: req.user.organizationId }
        : {}),
      ...(status && role !== ROLES.STUDENT ? { status } : {}),
      ...(instructorId && role !== ROLES.INSTRUCTOR ? { instructorId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const [courses, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        include: {
          instructor: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { blocks: true, enrollments: true } }
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.course.count({ where })
    ]);
    res.json({ data: courses, meta: { page, limit, total } });
  })
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true } },
        organization: true,
        blocks: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: { activities: { orderBy: { order: "asc" } } }
            }
          }
        }
      }
    });
    if (!course) throw new HttpError(404, "Course not found");
    const canEdit =
      COURSE_EDITOR_ROLES.includes(req.user.role.name) &&
      (req.user.role.name !== ROLES.INSTRUCTOR || course.instructorId === req.user.id);
    if (!canEdit && course.status !== "PUBLISHED") {
      throw new HttpError(403, "Course is not published");
    }
    course.blocks = course.blocks.map((block) => ({
      ...block,
      topics: block.topics.map((topic) => ({
        ...topic,
        activities: topic.activities.map((activity) => sanitizeActivity(activity, canEdit))
      }))
    }));
    res.json({ data: course, canEdit });
  })
);

router.post(
  "/",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    if (req.body.status === "PUBLISHED") {
      throw new HttpError(400, "Create the course as a draft and add activities before publishing");
    }
    const instructorId =
      req.user.role.name === ROLES.INSTRUCTOR ? req.user.id : req.body.instructorId;
    const baseSlug = slugify(req.body.title);
    const count = await prisma.course.count({ where: { slug: { startsWith: baseSlug } } });
    const course = await prisma.course.create({
      data: {
        ...req.body,
        slug: count ? `${baseSlug}-${count + 1}` : baseSlug,
        instructorId
      }
    });
    res.status(201).json({ data: course });
  })
);

router.patch(
  "/:id",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  validate(courseSchema.partial()),
  asyncHandler(async (req, res) => {
    await assertCourseEditor(req.user, req.params.id);
    if (req.body.status === "PUBLISHED") {
      const activityCount = await prisma.activity.count({
        where: { topic: { block: { courseId: req.params.id } } }
      });
      if (!activityCount) {
        throw new HttpError(400, "A course must contain at least one activity before publishing");
      }
    }
    if (req.user.role.name === ROLES.INSTRUCTOR) delete req.body.instructorId;
    res.json({
      data: await prisma.course.update({ where: { id: req.params.id }, data: req.body })
    });
  })
);

router.delete(
  "/:id",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    await assertCourseEditor(req.user, req.params.id);
    const enrollments = await prisma.enrollment.count({ where: { courseId: req.params.id } });
    if (enrollments) throw new HttpError(409, "Archive courses that already have enrollments");
    await prisma.course.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
