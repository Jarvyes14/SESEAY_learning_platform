import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role.name,
      organizationId: user.organizationId
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, jwtid: sessionId }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function accessTokenExpiresAt(token) {
  const payload = jwt.decode(token);
  if (!payload?.exp) throw new Error("Access token does not have an expiration");
  return new Date(payload.exp * 1000);
}

export const authCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/"
};

export function authCookieOptionsUntil(expiresAt) {
  return {
    ...authCookieOptions,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now())
  };
}
