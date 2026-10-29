export const ROLE_LABELS = {
  platform_admin: "Administrador de plataforma",
  government_admin: "Administrador gubernamental",
  organization_admin: "Administrador de organización",
  instructor: "Instructor",
  student: "Participante"
};

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role?.replaceAll("_", " ") ?? "";
}

export const DIFFICULTY_LABELS = { BEGINNER: "Principiante", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado" };
export function difficultyLabel(value) { return DIFFICULTY_LABELS[value] ?? "Sin especificar"; }
