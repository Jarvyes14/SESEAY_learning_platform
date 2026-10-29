export default function StatusBadge({ value }) {
  const labels = { PUBLISHED: "PUBLICADO", COMPLETED: "COMPLETADO", GRADED: "CALIFICADO", ACTIVE: "ACTIVO", AVAILABLE: "DISPONIBLE", IN_PROGRESS: "EN PROGRESO", DRAFT: "BORRADOR", PENDING_REVIEW: "PENDIENTE DE REVISIÓN", ARCHIVED: "ARCHIVADO", LOCKED: "BLOQUEADO", WITHDRAWN: "RETIRADO" };
  const styles = {
    PUBLISHED: "bg-success/10 text-success",
    COMPLETED: "bg-success/10 text-success",
    GRADED: "bg-success/10 text-success",
    ACTIVE: "bg-primary/10 text-primary",
    AVAILABLE: "bg-primary/10 text-primary",
    IN_PROGRESS: "bg-primary/10 text-primary",
    DRAFT: "bg-warning/10 text-warning",
    PENDING_REVIEW: "bg-warning/10 text-warning",
    ARCHIVED: "bg-surface-muted text-text-secondary",
    LOCKED: "bg-surface-muted text-text-secondary",
    WITHDRAWN: "bg-error/10 text-error"
  };
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-5 ${styles[value] ?? styles.ARCHIVED}`}>
      {labels[value] ?? (value === "SUBMITTED" ? "ENVIADO" : "SIN ESTADO")}
    </span>
  );
}
