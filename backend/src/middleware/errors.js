import { Prisma } from "@prisma/client";

export function notFound(req, res) {
  res.status(404).json({ error: "No se encontró la ruta solicitada" });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Ya existe un registro con ese valor" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "No se encontró el registro" });
    }
    if (error.code === "P2003") {
      return res.status(409).json({ error: "No se puede completar la operación porque hay registros relacionados" });
    }
    if (error.code === "P2023") {
      return res.status(400).json({ error: "El identificador del registro no es válido" });
    }
  }

  const status = error.status ?? 500;
  const message = status >= 500 ? "Se produjo un error interno. Inténtalo de nuevo más tarde." : error.type === "entity.parse.failed" ? "El contenido de la solicitud no es válido." : error.type === "entity.too.large" ? "El archivo o la solicitud superan el tamaño permitido." : error.message ?? "No se pudo completar la solicitud.";
  const payload = { error: message };

  if (error.details) {
    payload.details = error.details;
  }

  if (status >= 500 && process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  res.status(status).json(payload);
}

