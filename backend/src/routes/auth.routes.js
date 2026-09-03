import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
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

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

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
      throw new HttpError(401, "Invalid email or password");
    }
    if (!user.isActive) throw new HttpError(403, "Account is inactive");

    const sessionId = randomUUID();
    const token = signAccessToken(user, sessionId);
    const expiresAt = accessTokenExpiresAt(token);
    const now = new Date();

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
        skip: env.MAX_ACTIVE_SESSIONS,
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
    if (!session) throw new HttpError(404, "Session not found");

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

router.post("/register", (_req, res) => {
  res.status(403).json({
    error: "Public registration is disabled. A platform administrator must create the account."
  });
});

export default router;
