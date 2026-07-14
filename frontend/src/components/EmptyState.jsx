import { Database } from "lucide-react";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-muted text-text-secondary">
        <Database size={22} />
      </span>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

