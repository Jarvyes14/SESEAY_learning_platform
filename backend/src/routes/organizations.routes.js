import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import { PLATFORM_ROLES, ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, slugSchema } from "../validation/common.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  allowRoles(...PLATFORM_ROLES, ROLES.ORGANIZATION_ADMIN),
  asyncHandler(async (req, res) => {
    const where =
      req.user.role.name === ROLES.ORGANIZATION_ADMIN
        ? { id: req.user.organizationId }
        : {};
    res.json({
      data: await prisma.organization.findMany({
        where,
        include: { _count: { select: { users: true, courses: true, enrollments: true } } },
        orderBy: { name: "asc" }
      })
    });
  })
);

router.post(
  "/",
  allowRoles(...PLATFORM_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(160),
      institutionName: z.string().trim().max(200).optional(),
      slug: slugSchema
    })
  ),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await prisma.organization.create({ data: req.body }) });
  })
);

router.patch(
  "/:id",
  allowRoles(...PLATFORM_ROLES, ROLES.ORGANIZATION_ADMIN),
  validate(idParamSchema, "params"),
  validate(
    z.object({
      name: z.string().trim().min(2).max(160).optional(),
      institutionName: z.string().trim().max(200).nullable().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    res.json({
      data: await prisma.organization.update({ where: { id: req.params.id }, data: req.body })
    });
  })
);

router.delete(
  "/:id",
  allowRoles(ROLES.PLATFORM_ADMIN),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    await prisma.organization.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;

