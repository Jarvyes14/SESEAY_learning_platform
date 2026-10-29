import { canDelegateRole, canAccessUser, isRoot, scopeFor, userScope, requirePermission, hasPermission } from "../lib/permissions.js";
import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { publicUser } from "../utils/serializers.js";
import { idParamSchema, paginationSchema } from "../validation/common.js";
import {
  assertPasswordPolicy,
  getPlatformSettings
} from "../services/platform-settings.service.js";

const router = Router();


async function assignableRole(user, name) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) throw new HttpError(400, "El rol seleccionado no existe");
  if (!canDelegateRole(user, role)) throw new HttpError(403, "No puedes asignar un rol con privilegios superiores a los tuyos");
  return role;
}
function assertTarget(user, target) {
  if (!canAccessUser(user, target)) throw new HttpError(403, "La cuenta esta fuera de tu alcance de acceso");
  if (!isRoot(user) && !canDelegateRole(user, target.role)) throw new HttpError(403, "No puedes gestionar una cuenta con privilegios superiores a los tuyos");
}
router.use(requireAuth);

router.get(
  "/roles",
  allowRoles(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    res.json({
      data: (await prisma.role.findMany({
        
        orderBy: { displayName: "asc" }
      })).filter(role => canDelegateRole(req.user, role))
    });
  })
);

router.get(
  "/authorized-emails",
  allowRoles(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const data = await prisma.authorizedEmail.findMany({
      where:
        scopeFor(req.user) === "GLOBAL" ? {} : scopeFor(req.user) === "ORGANIZATION" ? { organizationId: userScope(req.user).organizationId } : { email: req.user.email },
      include: { role: true, organization: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      data: data.map((entry) => ({
        id: entry.id,
        email: entry.email,
        role: entry.role.name,
        roleDisplayName: entry.role.displayName,
        organization: entry.organization,
        registeredAt: entry.registeredAt,
        createdAt: entry.createdAt
      }))
    });
  })
);

router.post(
  "/authorized-emails",
  allowRoles(...ADMIN_ROLES),
  validate(
    z.object({
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      role: z.string().min(1).max(100),
      organizationId: z.string().uuid().nullable().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    if (scopeFor(req.user) === "OWN" && req.body.email !== req.user.email) throw new HttpError(403, "El alcance propio no permite autorizar otras cuentas");
    const selectedRole = await assignableRole(req.user, req.body.role);
    if (scopeFor(req.user) !== "GLOBAL") req.body.organizationId = req.user.organizationId;
    if (selectedRole.scope === "ORGANIZATION" && !req.body.organizationId) throw new HttpError(400, "Este rol requiere una organización");
    const [role, existingUser, organization] = await Promise.all([
      prisma.role.findUnique({ where: { name: req.body.role } }),
      prisma.user.findUnique({ where: { email: req.body.email }, select: { id: true } }),
      req.body.organizationId
        ? prisma.organization.findUnique({ where: { id: req.body.organizationId }, select: { id: true } })
        : null
    ]);
    if (!role) throw new HttpError(500, "El rol seleccionado no está configurado");
    if (existingUser) throw new HttpError(409, "Ya existe una cuenta con este correo electrónico");
    if (req.body.organizationId && !organization) {
      throw new HttpError(400, "La organización seleccionada no existe");
    }

    const entry = await prisma.authorizedEmail.create({
      data: {
        email: req.body.email,
        roleId: role.id,
        organizationId: req.body.organizationId
      },
      include: { role: true, organization: true }
    });
    res.status(201).json({
      data: {
        id: entry.id,
        email: entry.email,
        role: entry.role.name,
        roleDisplayName: entry.role.displayName,
        organization: entry.organization,
        registeredAt: entry.registeredAt,
        createdAt: entry.createdAt
      }
    });
  })
);

router.delete(
  "/authorized-emails/:id",
  allowRoles(...ADMIN_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const entry = await prisma.authorizedEmail.findUnique({ where: { id: req.params.id } });
    if (!entry) throw new HttpError(404, "No se encontró el correo autorizado");
    if (scopeFor(req.user) !== "GLOBAL" && (scopeFor(req.user) === "OWN" ? entry.email !== req.user.email : entry.organizationId !== userScope(req.user).organizationId)) throw new HttpError(403, "El correo esta fuera de tu alcance");
    const entryRole = await prisma.role.findUnique({ where: { id: entry.roleId } });
    if (!canDelegateRole(req.user, entryRole)) throw new HttpError(403, "No puedes gestionar esta autorizacion");
    await prisma.authorizedEmail.delete({ where: { id: entry.id } });
    res.status(204).send();
  })
);

router.get(
  "/",
  allowRoles(...ADMIN_ROLES),
  validate(paginationSchema.extend({ role: z.string().min(1).max(100).optional() }), "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role } = req.validatedQuery;
    const where = {
      ...userScope(req.user),
      ...(role ? { role: { name: role } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: {
          role: true,
          organization: true,
          sessions: {
            orderBy: { lastSeenAt: "desc" },
            take: 5,
            select: {
              id: true,
              ipAddress: true,
              userAgent: true,
              createdAt: true,
              lastSeenAt: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    res.json({ data: users.map(user => publicUser(hasPermission(req.user, "users.sessions.view") ? user : { ...user, sessions: undefined })), meta: { page, limit, total } });
  })
);

router.get(
  "/:id",
  allowRoles(...ADMIN_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true, organization: true }
    });
    if (!user) throw new HttpError(404, "No se encontró la persona usuaria");
    if (!canAccessUser(req.user, user)) throw new HttpError(403, "La cuenta esta fuera de tu alcance");
    res.json({ data: publicUser(user) });
  })
);

router.patch(
  "/:id",
  allowRoles(...ADMIN_ROLES),
  validate(idParamSchema, "params"),
  validate(
    z.object({
      email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
      firstName: z.string().trim().min(2).max(80).optional(),
      lastName: z.string().trim().min(2).max(80).optional(),
      isActive: z.boolean().optional(),
      role: z.string().min(1).max(100).optional(),
      organizationId: z.string().uuid().nullable().optional(),
      password: z.string().min(8).max(72).optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true }
    });
    if (!target) throw new HttpError(404, "No se encontró la persona usuaria");
    assertTarget(req.user, target);
    for (const field of ["email", "firstName", "lastName"]) if (req.body[field] !== undefined && req.body[field] !== target[field]) requirePermission(req.user, "users.edit");
    if (req.body.isActive !== undefined && req.body.isActive !== target.isActive) requirePermission(req.user, "users.status");
    if (req.body.password) requirePermission(req.user, "users.reset_password");
    if ((req.body.role !== undefined && req.body.role !== target.role.name) || (req.body.organizationId !== undefined && req.body.organizationId !== target.organizationId)) requirePermission(req.user, "users.assign_roles");
    if (target.id === req.user.id && (req.body.isActive === false || (req.body.role && req.body.role !== target.role.name) || (req.body.organizationId !== undefined && req.body.organizationId !== target.organizationId))) throw new HttpError(400, "No puedes desactivar tu cuenta ni cambiar tu propio rol u organización");
    if (scopeFor(req.user) !== "GLOBAL" && req.body.organizationId !== undefined && req.body.organizationId !== target.organizationId) throw new HttpError(403, "No puedes cambiar cuentas fuera de tu organización");
    if (req.body.role && req.body.role !== target.role.name) await assignableRole(req.user, req.body.role);

    if (req.body.email && req.body.email !== target.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: { id: true }
      });
      if (existingUser) throw new HttpError(409, "Ya existe una cuenta con este correo electrónico");
    }

    const role = req.body.role
      ? await prisma.role.findUnique({ where: { name: req.body.role } })
      : null;
    if (req.body.role && !role) {
      throw new HttpError(500, "El rol seleccionado no está configurado");
    }

    const finalOrganizationId =
      req.body.organizationId === undefined ? target.organizationId : req.body.organizationId;
    if ((role ?? target.role).scope === "ORGANIZATION" && !finalOrganizationId) {
      throw new HttpError(400, "Las personas administradoras de organización deben pertenecer a una organización");
    }
    if (finalOrganizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: finalOrganizationId },
        select: { id: true }
      });
      if (!organization) throw new HttpError(400, "La organización seleccionada no existe");
    }

    const settings = req.body.password ? await getPlatformSettings() : null;
    if (req.body.password) assertPasswordPolicy(req.body.password, settings);
    const passwordHash = req.body.password ? await bcrypt.hash(req.body.password, 12) : undefined;
    const permissionsChanged =
      (req.body.role !== undefined && req.body.role !== target.role.name) ||
      (req.body.organizationId !== undefined &&
        req.body.organizationId !== target.organizationId);
    const emailChanged = req.body.email !== undefined && req.body.email !== target.email;
    const shouldRevokeSessions =
      Boolean(passwordHash) || emailChanged || permissionsChanged || req.body.isActive === false;

    const user = await prisma.$transaction(async (transaction) => {
      const updatedUser = await transaction.user.update({
        where: { id: req.params.id },
        data: {
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          isActive: req.body.isActive,
          organizationId: req.body.organizationId,
          roleId: role?.id,
          passwordHash,
          mustChangePassword: passwordHash ? true : undefined
        },
        include: { role: true, organization: true }
      });

      if (shouldRevokeSessions) {
        await transaction.session.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }

      return updatedUser;
    });
    res.json({ data: publicUser(user) });
  })
);

router.delete(
  "/:id",
  allowRoles(ROLES.PLATFORM_ADMIN),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (req.user.id === req.params.id) throw new HttpError(400, "No puedes eliminar tu propia cuenta");
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { role: true } });
    if (!target) throw new HttpError(404, "No se encontró la persona usuaria");
    assertTarget(req.user, target);
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
