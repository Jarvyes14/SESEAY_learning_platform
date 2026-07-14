import { HttpError } from "../lib/http-error.js";

export const allowRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role.name)) {
      return next(new HttpError(403, "You do not have permission to perform this action"));
    }

    next();
  };

