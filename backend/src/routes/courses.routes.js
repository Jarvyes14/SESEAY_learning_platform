import { hasPermission, requirePermission, scopeFor, courseScope, organizationScope, canAccessCourse, templateScope } from "../lib/permissions.js";
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
  assertCourseAccess,
  courseAudienceWhere,
  sanitizeActivity
} from "../services/course-access.service.js";
import { idParamSchema, paginationSchema } from "../validation/common.js";

const router = Router();
const difficulty = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const statuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const accessTypes = ["ROLE", "ORGANIZATION", "USERS"];
const optionalNullableUuid = z.preprocess(
  (value) => value === "" ? null : value,
  z.string().uuid().nullable().optional()
);
const courseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10),
  category: z.string().trim().min(2).max(100),
  difficulty: z.enum(difficulty),
  durationMinutes: z.coerce.number().int().min(1),
  passingGrade: z.coerce.number().min(0).max(100),
  status: z.enum(statuses).default("DRAFT"),
  certificateEnabled: z.boolean().default(false),
  certificateTemplateId: optionalNullableUuid,
  instructorId: optionalNullableUuid,
  organizationId: optionalNullableUuid,
  accessType: z.enum(accessTypes).optional(),
  accessRoleId: optionalNullableUuid,
  accessOrganizationId: optionalNullableUuid,
  accessUserIds: z.array(z.string().uuid()).max(500).optional()
});

async function resolveAudience(input, user) {
  const accessType = input.accessType ?? "ROLE";
  let accessRoleId = null;
  let accessOrganizationId = null;
  let accessUserIds = [];

  if (accessType === "ROLE") {
    accessRoleId = input.accessRoleId;
    if (!accessRoleId) {
      accessRoleId = (await prisma.role.findUnique({ where: { name: ROLES.STUDENT } }))?.id;
    }
    if (!accessRoleId || !(await prisma.role.findUnique({ where: { id: accessRoleId } }))) {
      throw new HttpError(400, "Selecciona un rol válido para el acceso");
    }
  }

  if (accessType === "ORGANIZATION") {
    accessOrganizationId = input.accessOrganizationId;
    if (!accessOrganizationId) throw new HttpError(400, "Selecciona una organización para el acceso");
    if (
      scopeFor(user) === "ORGANIZATION" &&
      accessOrganizationId !== user.organizationId
    ) {
      throw new HttpError(403, "Solo puedes dar acceso a personas de tu organización");
    }
    if (!(await prisma.organization.findUnique({ where: { id: accessOrganizationId } }))) {
      throw new HttpError(400, "La organización seleccionada para el acceso no existe");
    }
  }

  if (accessType === "USERS") {
    accessUserIds = [...new Set(input.accessUserIds ?? [])];
    if (!accessUserIds.length) throw new HttpError(400, "Selecciona al menos una persona usuaria");
    const where = {
      id: { in: accessUserIds },
      isActive: true,
      ...(scopeFor(user) === "ORGANIZATION"
        ? { organizationId: user.organizationId }
        : {})
    };
    if ((await prisma.user.count({ where })) !== accessUserIds.length) {
      throw new HttpError(400, "Una o más personas seleccionadas no son válidas o están fuera de tu ámbito de administración");
    }
  }

  return { accessType, accessRoleId, accessOrganizationId, accessUserIds };
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function validateCertificateTemplate(templateId, user) {
  if (!templateId) return;
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new HttpError(400, "La plantilla de certificado no existe");
  if (!(await prisma.certificateTemplate.findFirst({ where: { id: templateId, ...templateScope(user) } }))) {
    throw new HttpError(403, "No tienes permiso para usar esta plantilla de certificado");
  }
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
    const where = {
      ...courseScope(req.user),
      ...(status ? { status } : {}),
      ...(instructorId ? { AND: [{ instructorId }] } : {}),
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
          accessRole: { select: { id: true, name: true, displayName: true } },
          accessOrganization: { select: { id: true, name: true } },
          _count: { select: { blocks: true, enrollments: true, accessUsers: true } }
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
  "/catalog",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = req.validatedQuery;
    const where = {
      status: "PUBLISHED",
      ...courseAudienceWhere(req.user),
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
  "/audience-options",
  validate(paginationSchema, "query"),
  allowRoles(...COURSE_EDITOR_ROLES),
  asyncHandler(async (req, res) => {
    const organizationScope =
      scopeFor(req.user) === "ORGANIZATION"
        ? { id: req.user.organizationId }
        : {};
    const userScope =
      scopeFor(req.user) === "ORGANIZATION"
        ? { organizationId: req.user.organizationId }
        : {};
    const { page, limit, search } = req.validatedQuery;
    const where = { isActive: true, ...userScope, ...(search ? { OR: [{ email: { contains: search, mode: "insensitive" } }, { firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } : {}) };
    const [roles, organizations, users, total] = await prisma.$transaction([
      prisma.role.findMany({ orderBy: { displayName: "asc" } }),
      prisma.organization.findMany({ where: organizationScope, orderBy: { name: "asc" } }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: { select: { name: true, displayName: true } },
          organization: { select: { id: true, name: true } }
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
      }),
      prisma.user.count({ where })
    ]);
    res.json({ data: { roles, organizations, users, meta: { page, limit, total } } });
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
        accessRole: true,
        accessOrganization: true,
        accessUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: { select: { name: true, displayName: true } },
                organization: { select: { id: true, name: true } }
              }
            }
          }
        },
        blocks: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: { activities: { orderBy: { order: "asc" }, ...(req.query.outline === "true" ? { select: { id: true, title: true, type: true, points: true, order: true, topicId: true } } : {}) } }
            }
          }
        }
      }
    });
    if (!course) throw new HttpError(404, "No se encontró el curso");
    const canEdit = hasPermission(req.user, "courses.view") && canAccessCourse(req.user, course);
    if (!canEdit) {
      requirePermission(req.user, "learning.view");
      await assertCourseAccess(req.user, course.id);
      course.accessUsers = [];
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
    if (req.body.status !== "DRAFT") requirePermission(req.user, "courses.publish");
    if (req.body.status === "PUBLISHED") {
      throw new HttpError(400, "Crea el curso como borrador y agrega actividades antes de publicarlo");
    }
    const instructorId =
      scopeFor(req.user) === "OWN" ? req.user.id : req.body.instructorId ?? req.user.id;
    const organizationId =
      scopeFor(req.user) === "ORGANIZATION"
        ? organizationScope(req.user)
        : req.body.organizationId;
    const audience = await resolveAudience(req.body, req.user);
    await validateCertificateTemplate(req.body.certificateTemplateId, req.user);
    const {
      accessType: _accessType,
      accessRoleId: _accessRoleId,
      accessOrganizationId: _accessOrganizationId,
      accessUserIds: _accessUserIds,
      ...courseData
    } = req.body;
    const baseSlug = slugify(req.body.title);
    const count = await prisma.course.count({ where: { slug: { startsWith: baseSlug } } });
    const course = await prisma.course.create({
      data: {
        ...courseData,
        slug: count ? `${baseSlug}-${count + 1}` : baseSlug,
        instructorId,
        organizationId,
        certificateEnabled: Boolean(req.body.certificateTemplateId),
        accessType: audience.accessType,
        accessRoleId: audience.accessRoleId,
        accessOrganizationId: audience.accessOrganizationId,
        accessUsers: {
          create: audience.accessUserIds.map((userId) => ({ userId }))
        }
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
    const currentCourse = await assertCourseEditor(req.user, req.params.id);
    if (req.body.status !== undefined && req.body.status !== currentCourse.status) requirePermission(req.user, "courses.publish");
    if (req.body.status === "PUBLISHED") {
      const activityCount = await prisma.activity.count({
        where: { topic: { block: { courseId: req.params.id } } }
      });
      if (!activityCount) {
        throw new HttpError(400, "El curso debe tener al menos una actividad antes de publicarse");
      }
    }
    if (scopeFor(req.user) === "OWN") delete req.body.instructorId;
    if (scopeFor(req.user) === "ORGANIZATION") delete req.body.organizationId;
    if (req.body.certificateTemplateId !== undefined) {
      await validateCertificateTemplate(req.body.certificateTemplateId, req.user);
      req.body.certificateEnabled = Boolean(req.body.certificateTemplateId);
    } else {
      delete req.body.certificateEnabled;
    }
    const audienceChanged = [
      "accessType",
      "accessRoleId",
      "accessOrganizationId",
      "accessUserIds"
    ].some((field) => req.body[field] !== undefined);
    let audience;
    if (audienceChanged) {
      const current = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { accessUsers: { select: { userId: true } } }
      });
      audience = await resolveAudience(
        {
          accessType: req.body.accessType ?? current.accessType,
          accessRoleId:
            req.body.accessRoleId === undefined ? current.accessRoleId : req.body.accessRoleId,
          accessOrganizationId:
            req.body.accessOrganizationId === undefined
              ? current.accessOrganizationId
              : req.body.accessOrganizationId,
          accessUserIds:
            req.body.accessUserIds ?? current.accessUsers.map((entry) => entry.userId)
        },
        req.user
      );
    }
    const {
      accessType: _accessType,
      accessRoleId: _accessRoleId,
      accessOrganizationId: _accessOrganizationId,
      accessUserIds: _accessUserIds,
      ...courseData
    } = req.body;
    res.json({
      data: await prisma.course.update({
        where: { id: req.params.id },
        data: {
          ...courseData,
          ...(audience
            ? {
                accessType: audience.accessType,
                accessRoleId: audience.accessRoleId,
                accessOrganizationId: audience.accessOrganizationId,
                accessUsers: {
                  deleteMany: {},
                  create: audience.accessUserIds.map((userId) => ({ userId }))
                }
              }
            : {})
        }
      })
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
    if (enrollments) throw new HttpError(409, "Archiva los cursos que ya tienen inscripciones");
    await prisma.course.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
