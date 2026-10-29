import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional()
});

export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa letras minúsculas, números y guiones");

