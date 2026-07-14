export default function StatusBadge({ value }) {
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[value] ?? styles.ARCHIVED}`}>
      {value?.replaceAll("_", " ")}
    </span>
  );
}

