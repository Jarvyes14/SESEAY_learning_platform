import { HttpError } from "../lib/http-error.js";

export const allowRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Inicia sesión para continuar"));
    }

    if (req.authorizationGranted) return next();

    if (!roles.includes(req.user.role.name)) {
      return next(new HttpError(403, "No tienes permiso para realizar esta acción"));
    }

    next();
  };

