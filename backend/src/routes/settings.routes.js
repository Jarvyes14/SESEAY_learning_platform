import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import { ROLES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { getPlatformSettings, publicPlatformSettings } from "../services/platform-settings.service.js";
import { env } from "../config/env.js";
import { brandingSchema } from "../lib/branding.js";
import { decodeBrandAsset } from "../services/brand-assets.service.js";
import { HttpError } from "../lib/http-error.js";

const router = Router();
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Usa un color hexadecimal de 6 dígitos");
const logoValue = z.string().max(1_500_000).refine(
  (value) => /^https?:\/\//i.test(value) || /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(value),
  "El logo debe ser una URL válida o una imagen compatible"
).nullable();

router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    res.json({ data: publicPlatformSettings(await getPlatformSettings()) });
  })
);

router.get("/assets/:id", asyncHandler(async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) throw new HttpError(404, "Recurso no encontrado");
  const asset = await prisma.brandAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) throw new HttpError(404, "Recurso no encontrado");
  res.set({
    "Content-Type": asset.mimeType,
    "Content-Length": String(asset.content.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Content-Disposition": `${asset.kind === "document" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`
  });
  res.send(Buffer.from(asset.content));
}));

router.use(requireAuth, allowRoles(ROLES.PLATFORM_ADMIN));

router.post("/assets", validate(z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().max(150),
  kind: z.enum(["image", "font", "document"]),
  base64: z.string().min(1).max(5_400_000).regex(/^[A-Za-z0-9+/]*={0,2}$/)
}).strict()), asyncHandler(async (req, res) => {
  const content = decodeBrandAsset(req.body);
  const { kind, mimeType, fileName } = req.body;
  const asset = await prisma.brandAsset.create({ data: { kind, mimeType, fileName, content }, select: { id: true } });
  res.status(201).json({ data: { id: asset.id, url: `/api/settings/assets/${asset.id}`, fileName, mimeType } });
}));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await getPlatformSettings();
    res.json({
      data,
      smtpConfigured: Boolean(env.SMTP_HOST && (env.SMTP_FROM || data.supportEmail))
    });
  })
);

router.patch(
  "/",
  validate(
    z.object({
      platformName: z.string().trim().min(2).max(100).optional(),
      platformSubtitle: z.string().trim().min(2).max(160).optional(),
      primaryColor: hexColor.optional(),
      secondaryColor: hexColor.optional(),
      accentColor: hexColor.optional(),
      logoUrl: logoValue.optional(),
      branding: brandingSchema.optional(),
      supportEmail: z.string().trim().email().nullable().optional(),
      maxActiveSessions: z.number().int().min(1).max(50).optional(),
      passwordMinLength: z.number().int().min(8).max(72).optional(),
      passwordRequireUppercase: z.boolean().optional(),
      passwordRequireLowercase: z.boolean().optional(),
      passwordRequireNumber: z.boolean().optional(),
      passwordRequireSpecial: z.boolean().optional(),
      passwordResetExpiryMinutes: z.number().int().min(10).max(1440).optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const data = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.platformSettings.upsert({
        where: { id: "global" },
        update: req.body,
        create: { id: "global", ...req.body }
      });

      if (req.body.maxActiveSessions !== undefined) {
        const activeSessions = await transaction.session.findMany({
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
          select: { id: true, userId: true }
        });
        const sessionsPerUser = new Map();
        const sessionsToRevoke = [];
        for (const session of activeSessions) {
          const count = sessionsPerUser.get(session.userId) ?? 0;
          if (count >= updated.maxActiveSessions) sessionsToRevoke.push(session.id);
          sessionsPerUser.set(session.userId, count + 1);
        }
        if (sessionsToRevoke.length) {
          await transaction.session.updateMany({
            where: { id: { in: sessionsToRevoke } },
            data: { revokedAt: new Date() }
          });
        }
      }
      return updated;
    });
    res.json({ data });
  })
);

export default router;
