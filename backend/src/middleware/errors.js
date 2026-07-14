import { Prisma } from "@prisma/client";

export function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "A record with that value already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  const status = error.status ?? 500;
  const payload = { error: error.message ?? "Internal server error" };

  if (error.details) {
    payload.details = error.details;
  }

  if (status >= 500 && process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  res.status(status).json(payload);
}

