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
  blockId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).nullable().optional()
});

router.use(requireAuth, allowRoles(...COURSE_EDITOR_ROLES));

router.get(
  "/",
  validate(z.object({ blockId: z.string().uuid() }), "query"),
  asyncHandler(async (req, res) => {
    const block = await prisma.courseBlock.findUnique({
      where: { id: req.validatedQuery.blockId }
    });
    if (!block) throw new HttpError(404, "Block not found");
    await assertCourseEditor(req.user, block.courseId);
    res.json({
      data: await prisma.topic.findMany({
        where: { blockId: block.id },
        include: { activities: true },
        orderBy: { order: "asc" }
      })
    });
  })
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: { block: true, activities: { orderBy: { order: "asc" } } }
    });
    if (!topic) throw new HttpError(404, "Topic not found");
    await assertCourseEditor(req.user, topic.block.courseId);
    res.json({ data: topic });
  })
);

router.post(
  "/",
  validate(input),
  asyncHandler(async (req, res) => {
    const block = await prisma.courseBlock.findUnique({ where: { id: req.body.blockId } });
    if (!block) throw new HttpError(404, "Block not found");
    await assertCourseEditor(req.user, block.courseId);
    const enrollments = await prisma.enrollment.count({ where: { courseId: block.courseId } });
    if (enrollments) throw new HttpError(409, "Course structure cannot change after enrollment");
    const order = (await prisma.topic.count({ where: { blockId: block.id } })) + 1;
    res.status(201).json({
      data: await prisma.topic.create({ data: { ...req.body, order } })
    });
  })
);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(input.omit({ blockId: true }).partial()),
  asyncHandler(async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: { block: true }
    });
    if (!topic) throw new HttpError(404, "Topic not found");
    await assertCourseEditor(req.user, topic.block.courseId);
    res.json({ data: await prisma.topic.update({ where: { id: topic.id }, data: req.body }) });
  })
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: { block: true }
    });
    if (!topic) throw new HttpError(404, "Topic not found");
    await assertCourseEditor(req.user, topic.block.courseId);
    const enrollments = await prisma.enrollment.count({ where: { courseId: topic.block.courseId } });
    if (enrollments) throw new HttpError(409, "Course structure cannot change after enrollment");
    await prisma.topic.delete({ where: { id: topic.id } });
    res.status(204).send();
  })
);

export default router;
