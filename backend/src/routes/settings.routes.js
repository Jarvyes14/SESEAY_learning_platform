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

const router = Router();

router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    res.json({ data: publicPlatformSettings(await getPlatformSettings()) });
  })
);

router.use(requireAuth, allowRoles(ROLES.PLATFORM_ADMIN));

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
