import { HttpError } from "./http-error.js";

const permission = (key, group, label, description, requires = []) => ({ key, group, label, description, requires });
export const PERMISSIONS = [
  permission("reports.view", "Inicio e informes", "Consultar panel e informes", "Ver métricas dentro del alcance del rol."),
  permission("learning.view", "Aprendizaje", "Acceder a mi aprendizaje", "Consultar el catálogo asignado y los cursos propios."),
  permission("learning.enroll", "Aprendizaje", "Inscribirse en cursos", "Inscribirse y retirar las inscripciones propias.", ["learning.view"]),
  permission("learning.participate", "Aprendizaje", "Realizar actividades", "Abrir actividades, enviar respuestas y avanzar en cursos propios.", ["learning.view"]),
  permission("learning.claim_certificate", "Aprendizaje", "Reclamar certificado propio", "Solicitar el certificado de un curso completado.", ["learning.view", "certificates.view"]),
  permission("users.view", "Personas usuarias", "Consultar usuarios", "Ver cuentas, correos autorizados y organizaciones dentro del alcance."),
  permission("users.assign_roles", "Personas usuarias", "Asignar roles y organizaciones", "Cambiar el rol o la organización de otras cuentas sin otorgar privilegios superiores.", ["users.view"]),
  permission("users.authorize", "Personas usuarias", "Autorizar registros", "Autorizar correos para crear cuentas y retirar autorizaciones.", ["users.view", "users.assign_roles"]),
  permission("users.edit", "Personas usuarias", "Editar datos de usuarios", "Cambiar nombres y correo electrónico de cuentas permitidas.", ["users.view"]),
  permission("users.status", "Personas usuarias", "Activar y desactivar cuentas", "Habilitar o suspender cuentas dentro del alcance.", ["users.view"]),
  permission("users.reset_password", "Personas usuarias", "Restablecer contraseñas de usuarios", "Establecer una contraseña temporal y revocar sesiones.", ["users.view"]),
  permission("users.delete", "Personas usuarias", "Eliminar usuarios", "Eliminar cuentas permitidas, excepto la cuenta propia.", ["users.view"]),
  permission("users.sessions.view", "Personas usuarias", "Consultar accesos de usuarios", "Consultar fechas, dispositivos e historial de accesos.", ["users.view"]),
  permission("roles.view", "Roles y permisos", "Consultar roles y permisos", "Ver los roles existentes y el catálogo completo de permisos."),
  permission("roles.create", "Roles y permisos", "Crear roles", "Crear roles personalizados con permisos que puedes delegar.", ["roles.view"]),
  permission("roles.edit", "Roles y permisos", "Editar roles", "Cambiar el nombre, alcance y permisos de los roles permitidos.", ["roles.view"]),
  permission("roles.delete", "Roles y permisos", "Eliminar roles", "Eliminar roles personalizados sin usuarios ni referencias pendientes.", ["roles.view"]),
  permission("organizations.view", "Organizaciones", "Consultar organizaciones", "Ver las organizaciones dentro del alcance."),
  permission("organizations.create", "Organizaciones", "Crear organizaciones", "Registrar organizaciones nuevas.", ["organizations.view"]),
  permission("organizations.edit", "Organizaciones", "Editar organizaciones", "Modificar datos de organizaciones permitidas.", ["organizations.view"]),
  permission("organizations.delete", "Organizaciones", "Eliminar organizaciones", "Eliminar organizaciones sin registros relacionados.", ["organizations.view"]),
  permission("courses.view", "Cursos", "Consultar administración de cursos", "Ver los cursos y su estructura dentro del alcance."),
  permission("courses.edit", "Cursos", "Editar configuración de cursos", "Cambiar datos generales, audiencia, evaluación y certificado.", ["courses.view"]),
  permission("courses.create", "Cursos", "Crear cursos", "Crear cursos como borrador.", ["courses.view", "courses.edit"]),
  permission("courses.publish", "Cursos", "Publicar y archivar cursos", "Cambiar el estado de publicación de los cursos.", ["courses.view", "courses.edit"]),
  permission("courses.delete", "Cursos", "Eliminar cursos", "Eliminar cursos permitidos sin inscripciones.", ["courses.view"]),
  permission("courses.content", "Cursos", "Gestionar bloques, lecciones y actividades", "Agregar, editar y eliminar el contenido de los cursos.", ["courses.view"]),
  permission("enrollments.view", "Seguimiento y evaluación", "Consultar inscripciones", "Ver inscripciones dentro del alcance."),
  permission("enrollments.manage", "Seguimiento y evaluación", "Gestionar inscripciones de otros usuarios", "Inscribir o retirar a otras personas dentro del alcance.", ["enrollments.view"]),
  permission("progress.view", "Seguimiento y evaluación", "Consultar progreso", "Ver el progreso propio o de otros usuarios según el alcance."),
  permission("progress.reset", "Seguimiento y evaluación", "Reiniciar progreso", "Restablecer el avance, intentos y resultados de cursos permitidos.", ["progress.view"]),
  permission("grades.view", "Seguimiento y evaluación", "Consultar calificaciones", "Ver resultados dentro del alcance."),
  permission("grades.review", "Seguimiento y evaluación", "Revisar y calificar tareas", "Asignar puntuaciones y comentarios a entregas permitidas.", ["grades.view"]),
  permission("certificates.view", "Certificados", "Consultar certificados", "Ver certificados dentro del alcance."),
  permission("certificates.issue", "Certificados", "Emitir certificados", "Emitir certificados de inscripciones permitidas.", ["certificates.view"]),
  permission("certificates.revoke", "Certificados", "Revocar certificados", "Revocar certificados dentro del alcance.", ["certificates.view"]),
  permission("certificate_templates.view", "Certificados", "Consultar plantillas de certificados", "Ver las plantillas dentro del alcance."),
  permission("certificate_templates.create", "Certificados", "Crear plantillas de certificados", "Cargar y configurar plantillas nuevas.", ["certificate_templates.view"]),
  permission("certificate_templates.edit", "Certificados", "Editar plantillas de certificados", "Modificar las plantillas permitidas.", ["certificate_templates.view"]),
  permission("certificate_templates.delete", "Certificados", "Eliminar plantillas de certificados", "Eliminar plantillas permitidas.", ["certificate_templates.view"]),
  permission("settings.view", "Configuración de la plataforma", "Consultar configuración", "Ver identidad visual, políticas de acceso y configuración general."),
  permission("settings.edit", "Configuración de la plataforma", "Modificar configuración", "Cambiar marca, archivos, tipografías, políticas y sesiones de la plataforma.", ["settings.view"])
];
export const PERMISSION_KEYS = PERMISSIONS.map(item => item.key);
export const SYSTEM_ROLES = ["platform_admin", "student"];
const learning = PERMISSION_KEYS.filter(key => key.startsWith("learning."));
const teaching = [...learning, ...PERMISSION_KEYS.filter(key => /^(courses\.|certificate_templates\.)/.test(key)), "progress.view", "progress.reset", "grades.view", "grades.review", "certificates.view", "certificates.issue", "enrollments.view", "enrollments.manage"];
export const BUILTIN_PERMISSIONS = {
  platform_admin: PERMISSION_KEYS,
  government_admin: PERMISSION_KEYS.filter(key => !key.startsWith("roles.") && !key.startsWith("settings.") && key !== "users.delete"),
  organization_admin: [...teaching, "reports.view", "users.view", "users.authorize", "users.assign_roles", "users.edit", "users.status", "users.reset_password", "users.sessions.view", "organizations.view"],
  instructor: teaching,
  student: [...learning, "progress.view", "grades.view", "certificates.view"]
};
export const BUILTIN_SCOPES = { platform_admin: "GLOBAL", government_admin: "GLOBAL", organization_admin: "ORGANIZATION", instructor: "OWN", student: "OWN" };
export function isRoot(user) { return user?.role?.name === "platform_admin"; }
export function permissionsFor(user) { return isRoot(user) ? PERMISSION_KEYS : user?.role?.permissions ?? BUILTIN_PERMISSIONS[user?.role?.name] ?? []; }
export function hasPermission(user, key) { return permissionsFor(user).includes(key); }
export function scopeFor(user) { return isRoot(user) ? "GLOBAL" : user?.role?.scope ?? BUILTIN_SCOPES[user?.role?.name] ?? "OWN"; }
export function requirePermission(user, key) { if (!hasPermission(user, key)) throw new HttpError(403, "No tienes permiso para realizar esta acción"); }
export function expandPermissions(keys) {
  const result = new Set(keys);
  for (const key of result) for (const dependency of PERMISSIONS.find(item => item.key === key)?.requires ?? []) result.add(dependency);
  return [...result].sort();
}
export function canDelegateRole(user, role) {
  if (isRoot(user)) return true;
  if (role.name === "platform_admin") return false;
  const scopeRank = { OWN: 0, ORGANIZATION: 1, GLOBAL: 2 };
  return scopeRank[role.scope ?? BUILTIN_SCOPES[role.name] ?? "OWN"] <= scopeRank[scopeFor(user)] && (role.permissions ?? BUILTIN_PERMISSIONS[role.name] ?? []).every(key => hasPermission(user, key));
}
export function canManageRole(user, role) {
  if (role.name === "platform_admin" || !canDelegateRole(user, role)) return false;
  if (scopeFor(user) === "GLOBAL") return true;
  if (role.isSystem) return false;
  return scopeFor(user) === "ORGANIZATION"
    ? Boolean(user.organizationId && role.organizationId === user.organizationId)
    : role.createdById === user.id;
}
export function organizationScope(user) {
  if (!user.organizationId) throw new HttpError(403, "Tu cuenta debe estar asignada a una organización para usar esta función");
  return user.organizationId;
}
export function userScope(user) {
  return scopeFor(user) === "GLOBAL" ? {} : scopeFor(user) === "ORGANIZATION" ? { organizationId: organizationScope(user) } : { id: user.id };
}
export function courseScope(user) {
  return scopeFor(user) === "GLOBAL" ? {} : scopeFor(user) === "ORGANIZATION" ? { organizationId: organizationScope(user) } : { instructorId: user.id };
}
export function enrollmentScope(user) {
  if (scopeFor(user) === "GLOBAL") return {};
  if (scopeFor(user) === "ORGANIZATION") return { organizationId: organizationScope(user) };
  return hasPermission(user, "enrollments.view") || hasPermission(user, "grades.review") || hasPermission(user, "progress.reset") || hasPermission(user, "certificates.issue") ? { OR: [{ studentId: user.id }, { course: { instructorId: user.id } }] } : { studentId: user.id };
}
export function canAccessCourse(user, course) {
  return scopeFor(user) === "GLOBAL" || (scopeFor(user) === "ORGANIZATION" ? Boolean(user.organizationId && course.organizationId === user.organizationId) : course.instructorId === user.id);
}
export function canAccessUser(user, target) { return scopeFor(user) === "GLOBAL" || (scopeFor(user) === "ORGANIZATION" ? Boolean(user.organizationId && target.organizationId === user.organizationId) : target.id === user.id); }

export function canAccessEnrollment(user, enrollment) {
  return scopeFor(user) === "GLOBAL" || (scopeFor(user) === "ORGANIZATION" ? Boolean(user.organizationId && enrollment.organizationId === user.organizationId) : enrollment.course?.instructorId === user.id);
}
export function templateScope(user) {
  return scopeFor(user) === "GLOBAL" ? {} : scopeFor(user) === "ORGANIZATION" ? { createdBy: { organizationId: organizationScope(user) } } : { createdById: user.id };
}
