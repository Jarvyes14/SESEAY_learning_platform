import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, _res, next) {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies[env.COOKIE_NAME] ?? bearerToken;

    if (!token) {
      throw new HttpError(401, "Authentication required");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, organization: true }
    });

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid or inactive account");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired session"));
  }
}

export function optionalAuth(req, _res, next) {
  const token = req.cookies[env.COOKIE_NAME];
  if (!token) {
    return next();
  }

  return requireAuth(req, _res, next);
}

