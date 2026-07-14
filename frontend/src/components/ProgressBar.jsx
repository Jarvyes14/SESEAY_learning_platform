export default function ProgressBar({ value, label, compact = false }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between text-xs font-medium text-text-secondary">
          <span>{label}</span>
          <span>{safeValue}%</span>
        </div>
      )}
      <div className={`overflow-hidden rounded-full bg-surface-muted ${compact ? "h-1.5" : "h-2.5"}`}>
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${safeValue}%` }}
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={safeValue}
        />
      </div>
    </div>
  );
}

