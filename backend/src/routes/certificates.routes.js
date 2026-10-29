import { publicTemplate, publicCertificate, templateSelect, sendImage, persistCertificateImage } from "../utils/certificates.js";
import { enrollmentScope, templateScope, requirePermission } from "../lib/permissions.js";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { COURSE_EDITOR_ROLES, PLATFORM_ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { assertCourseEditor } from "../services/course-access.service.js";
import { issueCertificateForEnrollment } from "../services/certificate.service.js";
import { recalculateEnrollment } from "../services/learning.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();

const imageDataSchema = z
  .string()
  .max(6_000_000)
  .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "La plantilla debe ser una imagen PNG, JPG o WebP válida");

const templateFields = {
  name: z.string().trim().min(3).max(100),
  backgroundImage: imageDataSchema,
  nameX: z.number().min(0).max(100),
  nameY: z.number().min(0).max(100),
  nameWidth: z.number().min(15).max(100),
  fontSize: z.number().int().min(12).max(120),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "El color debe usar el formato hexadecimal #RRGGBB"),
  fontFamily: z.enum(["serif", "sans-serif", "cursive"])
};

const createTemplateSchema = z.object(templateFields);
const updateTemplateSchema = z.object(templateFields).partial().refine((data) => Object.keys(data).length > 0, {
  message: "Incluye al menos un campo para actualizar"
});

async function assertTemplateManager(user, templateId) {
  const template = await prisma.certificateTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new HttpError(404, "Plantilla no encontrada");
  if (!(await prisma.certificateTemplate.findFirst({ where: { id: templateId, ...templateScope(user) } }))) {
    throw new HttpError(403, "No tienes permiso para modificar esta plantilla");
  }
  return template;
}

router.get(
  "/verify/:certificateId",
  asyncHandler(async (req, res) => {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId: req.params.certificateId }
    });
    if (!certificate || certificate.revokedAt) {
      throw new HttpError(404, "No se encontró un certificado válido");
    }
    res.json({ data: publicCertificate(certificate) });
  })
);

router.get("/verify/:certificateId/image", asyncHandler(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({ where: { certificateId: req.params.certificateId } });
  if (!certificate || certificate.revokedAt) throw new HttpError(404, "No se encontró un certificado válido");
  return sendImage(res, certificate.templateSnapshot?.backgroundImage);
}));

router.use(requireAuth);

router.get(
  "/templates",
  allowRoles(...COURSE_EDITOR_ROLES),
  asyncHandler(async (req, res) => {
    res.json({
      data: (await prisma.certificateTemplate.findMany({
        where: templateScope(req.user),
        select: { ...templateSelect, createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { updatedAt: "desc" }
      })).map(publicTemplate)
    });
  })
);

router.get("/templates/:id/image", validate(idParamSchema, "params"), asyncHandler(async (req, res) => {
  const template = await assertTemplateManager(req.user, req.params.id);
  return sendImage(res, template.backgroundImage);
}));

router.post(
  "/templates",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(createTemplateSchema),
  asyncHandler(async (req, res) => {
    req.body.backgroundImage = await persistCertificateImage(req.body.backgroundImage);
    const template = await prisma.certificateTemplate.create({
      data: { ...req.body, createdById: req.user.id }
    });
    res.status(201).json({ data: publicTemplate(template) });
  })
);

router.patch(
  "/templates/:id",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  validate(updateTemplateSchema),
  asyncHandler(async (req, res) => {
    await assertTemplateManager(req.user, req.params.id);
    if (req.body.backgroundImage) req.body.backgroundImage = await persistCertificateImage(req.body.backgroundImage);
    const template = await prisma.certificateTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ data: publicTemplate(template) });
  })
);

router.delete(
  "/templates/:id",
  allowRoles(...COURSE_EDITOR_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    await assertTemplateManager(req.user, req.params.id);
    await prisma.$transaction([
      prisma.course.updateMany({
        where: { certificateTemplateId: req.params.id },
        data: { certificateEnabled: false }
      }),
      prisma.certificateTemplate.delete({ where: { id: req.params.id } })
    ]);
    res.status(204).send();
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = { enrollment: enrollmentScope(req.user) };
    res.json({
      data: (await prisma.certificate.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { title: true } }
        },
        orderBy: { issuedAt: "desc" }
      })).map(publicCertificate)
    });
  })
);

router.post(
  "/enrollments/:id/claim",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
    if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
    if (enrollment.studentId === req.user.id) requirePermission(req.user, "learning.claim_certificate");
    else {
      requirePermission(req.user, "certificates.issue");
      await assertCourseEditor(req.user, enrollment.courseId);
    }
    const certificate = await issueCertificateForEnrollment(enrollment.id);
    res.status(201).json({ data: publicCertificate(certificate) });
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
    if (!enrollment) throw new HttpError(404, "No se encontró la inscripción");
    await assertCourseEditor(req.user, enrollment.courseId);
    await recalculateEnrollment(enrollment.id);
    const certificate = await issueCertificateForEnrollment(enrollment.id);
    res.status(201).json({ data: publicCertificate(certificate) });
  })
);

router.delete(
  "/:id",
  allowRoles(...PLATFORM_ROLES),
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const certificate = await prisma.certificate.findFirst({ where: { id: req.params.id, enrollment: enrollmentScope(req.user) } });
    if (!certificate) throw new HttpError(404, "No se encontró el certificado dentro de tu alcance");
    await prisma.certificate.update({
      where: { id: req.params.id },
      data: { revokedAt: new Date() }
    });
    res.status(204).send();
  })
);

export default router;
