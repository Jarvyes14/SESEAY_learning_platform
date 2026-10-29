import { HttpError } from "../lib/http-error.js";
import { hasPermission } from "../lib/permissions.js";
import { requireAuth } from "./auth.js";

export function requestPermissions(method, path, req = {}) {
  if (path.startsWith("/auth/")) return [];
  if (path === "/roles/permissions" && method === "GET") return ["roles.view"];
  if (/^\/roles(?:\/[^/]+)?$/.test(path)) return [{ GET: "roles.view", POST: "roles.create", PATCH: "roles.edit", DELETE: "roles.delete" }[method]].filter(Boolean);
  if (path === "/users/roles") return ["users.view", "users.authorize", "users.assign_roles"];
  if (path === "/users/authorized-emails" || /^\/users\/authorized-emails\/[^/]+$/.test(path)) return method === "GET" ? ["users.view", "users.authorize"] : ["users.authorize"];
  if (/^\/users(?:\/[^/]+)?$/.test(path)) return method === "GET" ? ["users.view"] : method === "DELETE" ? ["users.delete"] : ["users.edit", "users.status", "users.assign_roles", "users.reset_password"];
  if (/^\/organizations(?:\/[^/]+)?$/.test(path)) return method === "GET" ? ["organizations.view", "users.view", "courses.view", "courses.create"] : [{ POST: "organizations.create", PATCH: "organizations.edit", DELETE: "organizations.delete" }[method]].filter(Boolean);
  if (path === "/courses/catalog") return ["learning.view"];
  if (path === "/courses/audience-options") return ["courses.edit"];
  if (/^\/courses(?:\/[^/]+)?$/.test(path)) return method === "GET" ? path === "/courses" ? ["courses.view"] : ["courses.view", "learning.view"] : [{ POST: "courses.create", PATCH: "courses.edit", DELETE: "courses.delete" }[method]].filter(Boolean);
  if (/^\/(blocks|topics|activities)(?:\/[^/]+)?$/.test(path)) return method === "GET" ? ["courses.view"] : ["courses.content"];
  if (/^\/enrollments\/[^/]+\/reset-progress$/.test(path)) return ["progress.reset"];
  if (/^\/enrollments(?:\/[^/]+)?$/.test(path)) return method === "GET" ? req.query?.mine === "true" ? ["learning.view"] : ["enrollments.view", "progress.view"] : method === "POST" ? req.body?.studentId && req.body.studentId !== req.user?.id ? ["enrollments.manage"] : ["learning.enroll"] : ["learning.enroll", "enrollments.manage"];
  if (path === "/progress") return ["progress.view"];
  if (/^\/progress\/courses\/[^/]+$/.test(path)) return ["learning.view"];
  if (/^\/progress\/activities\/[^/]+\/(start|reading|content|video|composite|attempts|module-start|playback)$/.test(path)) return ["learning.participate"];
  if (path === "/grades/pending" || /^\/grades\/attempts\/[^/]+\/review$/.test(path)) return ["grades.review"];
  if (["/grades", "/grades/overview"].includes(path)) return ["grades.view"];
  if (/^\/certificates\/templates\/[^/]+\/image$/.test(path) && method === "GET") return ["certificate_templates.view"];
  if (/^\/certificates\/templates(?:\/[^/]+)?$/.test(path)) return [{ GET: "certificate_templates.view", POST: "certificate_templates.create", PATCH: "certificate_templates.edit", DELETE: "certificate_templates.delete" }[method]].filter(Boolean);
  if (/^\/certificates\/enrollments\/[^/]+\/claim$/.test(path)) return ["learning.claim_certificate", "certificates.issue"];
  if (/^\/certificates\/enrollments\/[^/]+\/issue$/.test(path)) return ["certificates.issue"];
  if (/^\/certificates(?:\/[^/]+)?$/.test(path)) return method === "GET" ? ["certificates.view"] : ["certificates.revoke"];
  if (path === "/reports/overview") return ["reports.view"];
  if (path === "/settings") return method === "GET" ? ["settings.view"] : ["settings.edit"];
  if (path === "/settings/assets" && method === "POST") return ["settings.edit"];
  return null;
}

export function enforcePermissions(req, res, next) {
  const path = req.path.replace(/\/$/, "") || "/";
  if ((req.method === "GET" && (path === "/settings/public" || /^\/settings\/assets\/[^/]+$/.test(path) || /^\/certificates\/verify\/[^/]+(?:\/image)?$/.test(path))) || ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"].includes(path)) return next();
  return requireAuth(req, res, error => {
    if (error) return next(error);
    const required = requestPermissions(req.method, path, req);
    if (!required) return next(new HttpError(404, "No se encontró la ruta solicitada"));
    if (required.length && !required.some(key => hasPermission(req.user, key))) return next(new HttpError(403, "No tienes permiso para realizar esta acción"));
    req.authorizationGranted = true;
    next();
  });
}
