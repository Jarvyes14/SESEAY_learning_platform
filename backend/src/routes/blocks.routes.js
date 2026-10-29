import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { COURSE_EDITOR_ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { assertCourseEditor } from "../services/course-access.service.js";
import { idParamSchema } from "../validation/common.js";

const router = Router();
const input = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).nullable().optional()
});

router.use(requireAuth, allowRoles(...COURSE_EDITOR_ROLES));

router.get(
  "/",
  validate(z.object({ courseId: z.string().uuid() }), "query"),
  asyncHandler(async (req, res) => {
    await assertCourseEditor(req.user, req.validatedQuery.courseId);
    res.json({
      data: await prisma.courseBlock.findMany({
        where: { courseId: req.validatedQuery.courseId },
        include: { topics: true },
        orderBy: { order: "asc" }
      })
    });
  })
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const block = await prisma.courseBlock.findUnique({
      where: { id: req.params.id },
      include: { topics: { orderBy: { order: "asc" } } }
    });
    if (!block) throw new HttpError(404, "No se encontró el bloque");
    await assertCourseEditor(req.user, block.courseId);
    res.json({ data: block });
  })
);

router.post(
  "/",
  validate(input),
  asyncHandler(async (req, res) => {
    await assertCourseEditor(req.user, req.body.courseId);
    const enrollments = await prisma.enrollment.count({ where: { courseId: req.body.courseId } });
    if (enrollments) throw new HttpError(409, "No se puede cambiar la estructura de un curso que ya tiene inscripciones");
    const order = (await prisma.courseBlock.count({ where: { courseId: req.body.courseId } })) + 1;
    res.status(201).json({
      data: await prisma.courseBlock.create({ data: { ...req.body, order } })
    });
  })
);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(input.omit({ courseId: true }).partial()),
  asyncHandler(async (req, res) => {
    const block = await prisma.courseBlock.findUnique({ where: { id: req.params.id } });
    if (!block) throw new HttpError(404, "No se encontró el bloque");
    await assertCourseEditor(req.user, block.courseId);
    res.json({
      data: await prisma.courseBlock.update({ where: { id: block.id }, data: req.body })
    });
  })
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const block = await prisma.courseBlock.findUnique({ where: { id: req.params.id } });
    if (!block) throw new HttpError(404, "No se encontró el bloque");
    await assertCourseEditor(req.user, block.courseId);
    const enrollments = await prisma.enrollment.count({ where: { courseId: block.courseId } });
    if (enrollments) throw new HttpError(409, "No se puede cambiar la estructura de un curso que ya tiene inscripciones");
    await prisma.courseBlock.delete({ where: { id: block.id } });
    res.status(204).send();
  })
);

export default router;
