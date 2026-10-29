import { HttpError } from "../lib/http-error.js";

export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(new HttpError(400, "Revisa los datos ingresados", result.error.flatten()));
    }

    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
