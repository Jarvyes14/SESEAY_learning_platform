export const ROLE_LABELS = {
  platform_admin: "Administrador de plataforma",
  government_admin: "Administrador gubernamental",
  organization_admin: "Administrador de organización",
  instructor: "Instructor",
  student: "Estudiante"
};

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role?.replaceAll("_", " ") ?? "";
}
