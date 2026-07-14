import bcrypt from "bcrypt";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { authCookieOptions, signAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { publicUser } from "../utils/serializers.js";

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

    res
      .cookie(env.COOKIE_NAME, signAccessToken(user), authCookieOptions)
      .json({ user: publicUser(user) });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, { ...authCookieOptions, maxAge: undefined }).status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/register", (_req, res) => {
  res.status(403).json({
    error: "Public registration is disabled. A platform administrator must create the account."
  });
});

export default router;

