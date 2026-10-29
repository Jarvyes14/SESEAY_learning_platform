import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { PERMISSIONS, PERMISSION_KEYS, expandPermissions, canDelegateRole, canManageRole, scopeFor, organizationScope } from "../lib/permissions.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema } from "../validation/common.js";
const router = Router();
const input = z.object({
  displayName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(""),
  scope: z.enum(["OWN", "ORGANIZATION", "GLOBAL"]),
  permissions: z.array(z.enum(PERMISSION_KEYS)).max(PERMISSION_KEYS.length).transform(expandPermissions)
});
const include = { _count: { select: { users: true, authorizedEmails: true, accessibleCourses: true } } };
const serialize = (role, user) => ({ ...role, canManage: canManageRole(user, role) });
router.get("/permissions", (_req, res) => res.json({ data: PERMISSIONS }));
router.get("/", asyncHandler(async (req, res) => {
  const data = await prisma.role.findMany({ include, orderBy: { displayName: "asc" } });
  res.json({ data: data.map(role => serialize(role, req.user)) });
}));
async function assertName(transaction, displayName, id) {
  const duplicate = await transaction.role.findFirst({ where: { displayName: { equals: displayName, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) throw new HttpError(409, "Ya existe un rol con ese nombre");
}
function assertDelegation(user, role) {
  if (!canDelegateRole(user, role)) throw new HttpError(403, "Solo puedes gestionar roles con permisos y alcance que puedes delegar");
}
router.post("/", validate(input), asyncHandler(async (req, res) => {
  assertDelegation(req.user, req.body);
  const role = await prisma.$transaction(async tx => {
    await assertName(tx, req.body.displayName);
    return tx.role.create({ data: { ...req.body, name: `custom_${randomUUID()}`, createdById: req.user.id, organizationId: scopeFor(req.user) === "ORGANIZATION" ? organizationScope(req.user) : req.user.organizationId }, include });
  });
  res.status(201).json({ data: serialize(role, req.user) });
}));
router.patch("/:id", validate(idParamSchema, "params"), validate(input), asyncHandler(async (req, res) => {
  const role = await prisma.$transaction(async tx => {
    const current = await tx.role.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, "No se encontró el rol");
    if (current.name === "platform_admin") throw new HttpError(403, "El rol de administración de plataforma está protegido");
    if (!canManageRole(req.user, current)) throw new HttpError(403, "El rol está fuera de tu alcance de administración");
    assertDelegation(req.user, current);
    assertDelegation(req.user, req.body);
    await assertName(tx, req.body.displayName, current.id);
    if (req.body.scope === "ORGANIZATION" && (await tx.user.count({ where: { roleId: current.id, organizationId: null } }) || await tx.authorizedEmail.count({ where: { roleId: current.id, organizationId: null } }))) throw new HttpError(409, "Asigna una organización a los usuarios y correos autorizados de este rol antes de cambiar su alcance");
    return tx.role.update({ where: { id: current.id }, data: req.body, include });
  });
  res.json({ data: serialize(role, req.user) });
}));
router.delete("/:id", validate(idParamSchema, "params"), asyncHandler(async (req, res) => {
  await prisma.$transaction(async tx => {
    const role = await tx.role.findUnique({ where: { id: req.params.id }, include });
    if (!role) throw new HttpError(404, "No se encontró el rol");
    if (role.isSystem || role.name === "platform_admin") throw new HttpError(403, "Los roles del sistema están protegidos contra eliminación");
    if (!canManageRole(req.user, role)) throw new HttpError(403, "El rol está fuera de tu alcance de administración");
    assertDelegation(req.user, role);
    if (role._count.users) throw new HttpError(409, "No puedes eliminar un rol mientras tenga usuarios asignados. Reasigna sus usuarios primero.");
    if (role._count.authorizedEmails || role._count.accessibleCourses) throw new HttpError(409, "Retira primero este rol de los correos autorizados y de las audiencias de cursos");
    await tx.role.delete({ where: { id: role.id } });
  });
  res.status(204).send();
}));
export default router;
