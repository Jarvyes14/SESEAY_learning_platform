import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import {
  accessTokenExpiresAt,
  authCookieOptions,
  authCookieOptionsUntil,
  signAccessToken,
  verifyAccessToken
} from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { getAuthToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { publicSession, publicUser } from "../utils/serializers.js";
import { idParamSchema } from "../validation/common.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { assertPasswordPolicy, getPlatformSettings } from "../services/platform-settings.service.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos de inicio de sesión. Inténtalo más tarde." }
});
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos de recuperación. Inténtalo más tarde." }
});
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos de registro. Inténtalo más tarde." }
});

router.post(
  "/register",
  registrationLimiter,
  validate(
    z.object({
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      firstName: z.string().trim().min(2).max(80),
      lastName: z.string().trim().min(2).max(80),
      password: z.string().min(1).max(72)
    })
  ),
  asyncHandler(async (req, res) => {
    const settings = await getPlatformSettings();
    assertPasswordPolicy(req.body.password, settings);

    const user = await prisma.$transaction(async (transaction) => {
      const authorization = await transaction.authorizedEmail.findUnique({
        where: { email: req.body.email },
        include: { role: true, organization: true }
      });

      if (!authorization) {
        throw new HttpError(403, "Este correo electrónico no está autorizado para crear una cuenta");
      }
      if (authorization.registeredAt) {
        throw new HttpError(409, "Ya se creó una cuenta con este correo electrónico");
      }

      const existingUser = await transaction.user.findUnique({
        where: { email: req.body.email },
        select: { id: true }
      });
      if (existingUser) {
        throw new HttpError(409, "Ya existe una cuenta con este correo electrónico");
      }

      const createdUser = await transaction.user.create({
        data: {
          email: req.body.email,
          passwordHash: await bcrypt.hash(req.body.password, 12),
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          roleId: authorization.roleId,
          organizationId: authorization.organizationId,
          mustChangePassword: false
        },
        include: { role: true, organization: true }
      });

      await transaction.authorizedEmail.update({
        where: { id: authorization.id },
        data: { registeredAt: new Date() }
      });
      return createdUser;
    });

    res.status(201).json({ data: publicUser(user) });
  })
);

router.post(
  "/login",
  limiter,
  validate(
    z.object({
      email: z.string().email().transform((value) => value.toLowerCase()),
      password: z.string().min(1)
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
      include: { role: true, organization: true }
    });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw new HttpError(401, "El correo electrónico o la contraseña son incorrectos");
    }
    if (!user.isActive) throw new HttpError(403, "La cuenta está inactiva");

    const sessionId = randomUUID();
    const token = signAccessToken(user, sessionId);
    const expiresAt = accessTokenExpiresAt(token);
    const now = new Date();
    const settings = await getPlatformSettings();

    await prisma.$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          ipAddress: req.ip?.slice(0, 255),
          userAgent: req.get("user-agent")?.slice(0, 1000),
          expiresAt
        }
      });

      const sessionsOverLimit = await transaction.session.findMany({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        orderBy: { createdAt: "desc" },
        skip: settings.maxActiveSessions,
        select: { id: true }
      });

      if (sessionsOverLimit.length) {
        await transaction.session.updateMany({
          where: { id: { in: sessionsOverLimit.map((session) => session.id) } },
          data: { revokedAt: now }
        });
      }
    });

    res
      .cookie(env.COOKIE_NAME, token, authCookieOptionsUntil(expiresAt))
      .json({ user: publicUser(user) });
  })
);

router.post(
  "/forgot-password",
  recoveryLimiter,
  validate(
    z.object({
      email: z.string().trim().email().transform((value) => value.toLowerCase())
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (user?.isActive) {
      const settings = await getPlatformSettings();
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + settings.passwordResetExpiryMinutes * 60 * 1000);

      await prisma.$transaction([
        prisma.passwordToken.updateMany({
          where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null },
          data: { usedAt: new Date() }
        }),
        prisma.passwordToken.create({
          data: { userId: user.id, tokenHash, purpose: "PASSWORD_RESET", expiresAt }
        })
      ]);

      try {
        await sendPasswordResetEmail({ user, token, settings });
      } catch (error) {
        console.error("Password recovery email delivery failed", error.message);
      }
    }

    res.status(202).json({
      message: "Si existe una cuenta activa con ese correo electrónico, se envió un enlace de recuperación."
    });
  })
);

router.post(
  "/reset-password",
  recoveryLimiter,
  validate(z.object({ token: z.string().min(64).max(128), password: z.string().min(1).max(72) })),
  asyncHandler(async (req, res) => {
    const tokenHash = createHash("sha256").update(req.body.token).digest("hex");
    const passwordToken = await prisma.passwordToken.findFirst({
      where: {
        tokenHash,
        purpose: "PASSWORD_RESET",
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });
    if (!passwordToken || !passwordToken.user.isActive) {
      throw new HttpError(400, "El enlace de recuperación no es válido o venció");
    }

    const settings = await getPlatformSettings();
    assertPasswordPolicy(req.body.password, settings);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordToken.userId },
        data: { passwordHash: await bcrypt.hash(req.body.password, 12), mustChangePassword: false }
      }),
      prisma.passwordToken.update({ where: { id: passwordToken.id }, data: { usedAt: now } }),
      prisma.session.updateMany({
        where: { userId: passwordToken.userId, revokedAt: null },
        data: { revokedAt: now }
      })
    ]);

    res.clearCookie(env.COOKIE_NAME, authCookieOptions).json({ message: "La contraseña se actualizó correctamente" });
  })
);

router.post(
  "/change-password",
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(1).max(72) })),
  asyncHandler(async (req, res) => {
    if (!(await bcrypt.compare(req.body.currentPassword, req.user.passwordHash))) {
      throw new HttpError(400, "La contraseña actual es incorrecta");
    }
    const settings = await getPlatformSettings();
    assertPasswordPolicy(req.body.newPassword, settings);
    if (await bcrypt.compare(req.body.newPassword, req.user.passwordHash)) {
      throw new HttpError(400, "La contraseña nueva debe ser diferente de la actual");
    }

    const now = new Date();
    const user = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: req.user.id },
        data: {
          passwordHash: await bcrypt.hash(req.body.newPassword, 12),
          mustChangePassword: false
        },
        include: { role: true, organization: true }
      });
      await transaction.session.updateMany({
        where: { userId: req.user.id, id: { not: req.authSession.id }, revokedAt: null },
        data: { revokedAt: now }
      });
      return updated;
    });
    res.json({ user: publicUser(user) });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = getAuthToken(req);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (typeof payload.jti === "string" && typeof payload.sub === "string") {
          await prisma.session.updateMany({
            where: { id: payload.jti, userId: payload.sub, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        }
      } catch {
        // An invalid or expired token still needs its browser cookie cleared.
      }
    }

    res.clearCookie(env.COOKIE_NAME, authCookieOptions).status(204).send();
  })
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastSeenAt: "desc" }
    });

    res.json({
      data: sessions.map((session) => publicSession(session, req.authSession.id))
    });
  })
);

router.delete(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await prisma.session.updateMany({
      where: {
        userId: req.user.id,
        id: { not: req.authSession.id },
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { revokedAt: new Date() }
    });

    res.json({ revoked: result.count });
  })
);

router.delete(
  "/sessions/:id",
  requireAuth,
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true }
    });
    if (!session) throw new HttpError(404, "No se encontró la sesión");

    await prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    const revokedCurrent = session.id === req.authSession.id;
    if (revokedCurrent) {
      res.clearCookie(env.COOKIE_NAME, authCookieOptions);
    }
    res.json({ revokedCurrent });
  })
);

export default router;
