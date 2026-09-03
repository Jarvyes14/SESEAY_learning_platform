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

const router = Router();
const roleNames = Object.values(ROLES);

function manageableRolesFor(user) {
  if (user.role.name === ROLES.PLATFORM_ADMIN) return roleNames;
  if (user.role.name === ROLES.GOVERNMENT_ADMIN) {
    return roleNames.filter((role) => role !== ROLES.PLATFORM_ADMIN);
  }
  return [ROLES.INSTRUCTOR, ROLES.STUDENT];
}

router.use(requireAuth);
router.use((req, _res, next) => {
  if (req.user.role.name === ROLES.ORGANIZATION_ADMIN && !req.user.organizationId) {
    return next(new HttpError(403, "Your account is not assigned to an organization"));
  }
  next();
});

router.get(
  "/roles",
  allowRoles(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    res.json({
      data: await prisma.role.findMany({
        where: { name: { in: manageableRolesFor(req.user) } },
        orderBy: { displayName: "asc" }
      })
    });
  })
);

router.get(
  "/",
  allowRoles(...ADMIN_ROLES),
  validate(paginationSchema.extend({ role: z.enum(roleNames).optional() }), "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role } = req.validatedQuery;
    const where = {
      ...(req.user.role.name === ROLES.ORGANIZATION_ADMIN
        ? { organizationId: req.user.organizationId }
        : {}),
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
        include: { role: true, organization: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    res.json({ data: users.map(publicUser), meta: { page, limit, total } });
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
    if (!user) throw new HttpError(404, "User not found");
    if (
      req.user.role.name === ROLES.ORGANIZATION_ADMIN &&
      user.organizationId !== req.user.organizationId
    ) {
      throw new HttpError(403, "User is outside your organization");
    }
    res.json({ data: publicUser(user) });
  })
);

router.post(
  "/",
  allowRoles(...ADMIN_ROLES),
  validate(
    z.object({
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      password: z.string().min(8).max(72),
      firstName: z.string().trim().min(2).max(80),
      lastName: z.string().trim().min(2).max(80),
      role: z.enum(roleNames),
      organizationId: z.string().uuid().nullable().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    if (!manageableRolesFor(req.user).includes(req.body.role)) {
      throw new HttpError(403, "You cannot create a user with this role");
    }

    if (req.user.role.name === ROLES.ORGANIZATION_ADMIN) {
      if (!req.user.organizationId) {
        throw new HttpError(403, "Your account is not assigned to an organization");
      }
      req.body.organizationId = req.user.organizationId;
    }

    if (req.body.role === ROLES.ORGANIZATION_ADMIN && !req.body.organizationId) {
      throw new HttpError(400, "Organization administrators must belong to an organization");
    }

    const [role, existingUser, organization] = await Promise.all([
      prisma.role.findUnique({ where: { name: req.body.role } }),
      prisma.user.findUnique({ where: { email: req.body.email }, select: { id: true } }),
      req.body.organizationId
        ? prisma.organization.findUnique({
            where: { id: req.body.organizationId },
            select: { id: true }
          })
        : null
    ]);

    if (!role) throw new HttpError(500, "The selected role is not configured");
    if (existingUser) throw new HttpError(409, "An account with this email already exists");
    if (req.body.organizationId && !organization) {
      throw new HttpError(400, "The selected organization does not exist");
    }

    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash: await bcrypt.hash(req.body.password, 12),
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        roleId: role.id,
        organizationId: req.body.organizationId
      },
      include: { role: true, organization: true }
    });
    res.status(201).json({ data: publicUser(user) });
  })
);

router.patch(
  "/:id",
  allowRoles(...ADMIN_ROLES),
  validate(idParamSchema, "params"),
  validate(
    z.object({
      firstName: z.string().trim().min(2).max(80).optional(),
      lastName: z.string().trim().min(2).max(80).optional(),
      isActive: z.boolean().optional(),
      role: z.enum(roleNames).optional(),
      organizationId: z.string().uuid().nullable().optional(),
      password: z.string().min(8).max(72).optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true }
    });
    if (!target) throw new HttpError(404, "User not found");
    if (
      req.user.role.name === ROLES.ORGANIZATION_ADMIN &&
      target.organizationId !== req.user.organizationId
    ) {
      throw new HttpError(403, "User is outside your organization");
    }

    if (
      req.user.role.name !== ROLES.PLATFORM_ADMIN &&
      target.role.name === ROLES.PLATFORM_ADMIN
    ) {
      throw new HttpError(403, "Only a platform administrator can manage this account");
    }
    if (
      req.user.role.name === ROLES.ORGANIZATION_ADMIN &&
      target.id !== req.user.id &&
      !manageableRolesFor(req.user).includes(target.role.name)
    ) {
      throw new HttpError(403, "You cannot manage a user with this role");
    }
    if (target.id === req.user.id) {
      if (req.body.isActive === false) {
        throw new HttpError(400, "You cannot deactivate your own account");
      }
      if (req.body.role && req.body.role !== target.role.name) {
        throw new HttpError(400, "You cannot change your own role");
      }
      if (
        req.body.organizationId !== undefined &&
        req.body.organizationId !== target.organizationId
      ) {
        throw new HttpError(400, "You cannot change your own organization");
      }
    }
    if (req.body.role && !manageableRolesFor(req.user).includes(req.body.role)) {
      throw new HttpError(403, "You cannot assign this role");
    }
    if (req.user.role.name === ROLES.ORGANIZATION_ADMIN) {
      req.body.organizationId = req.user.organizationId;
    }

    const role = req.body.role
      ? await prisma.role.findUnique({ where: { name: req.body.role } })
      : null;
    if (req.body.role && !role) {
      throw new HttpError(500, "The selected role is not configured");
    }

    const finalRole = req.body.role ?? target.role.name;
    const finalOrganizationId =
      req.body.organizationId === undefined ? target.organizationId : req.body.organizationId;
    if (finalRole === ROLES.ORGANIZATION_ADMIN && !finalOrganizationId) {
      throw new HttpError(400, "Organization administrators must belong to an organization");
    }
    if (finalOrganizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: finalOrganizationId },
        select: { id: true }
      });
      if (!organization) throw new HttpError(400, "The selected organization does not exist");
    }

    const passwordHash = req.body.password
      ? await bcrypt.hash(req.body.password, 12)
      : undefined;
    const shouldRevokeSessions = Boolean(passwordHash) || req.body.isActive === false;

    const user = await prisma.$transaction(async (transaction) => {
      const updatedUser = await transaction.user.update({
        where: { id: req.params.id },
        data: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          isActive: req.body.isActive,
          organizationId: req.body.organizationId,
          roleId: role?.id,
          passwordHash
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
    if (req.user.id === req.params.id) throw new HttpError(400, "You cannot delete your own account");
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
