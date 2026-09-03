import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, _res, next) {
  try {
    const token = getAuthToken(req);

    if (!token) {
      throw new HttpError(401, "Authentication required");
    }

    const payload = verifyAccessToken(token);
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") {
      throw new HttpError(401, "Invalid session");
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.jti },
      include: {
        user: { include: { role: true, organization: true } }
      }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new HttpError(401, "Invalid, expired, or inactive session");
    }

    req.user = session.user;
    req.authSession = session;

    if (session.lastSeenAt.getTime() < Date.now() - 5 * 60 * 1000) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { lastSeenAt: new Date() }
      });
    }

    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired session"));
  }
}

export function getAuthToken(req) {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  return req.cookies?.[env.COOKIE_NAME] ?? bearerToken;
}

export function optionalAuth(req, _res, next) {
  const token = req.cookies[env.COOKIE_NAME];
  if (!token) {
    return next();
  }

  return requireAuth(req, _res, next);
}
