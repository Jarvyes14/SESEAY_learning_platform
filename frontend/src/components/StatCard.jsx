export default function StatCard({ label, value, detail, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    secondary: "bg-secondary/10 text-secondary"
  };

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {detail && <p className="mt-2 text-xs text-text-secondary">{detail}</p>}
        </div>
        {Icon && (
          <span className={`grid size-10 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </div>
  );
}

