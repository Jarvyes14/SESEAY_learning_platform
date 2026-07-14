export default function DisabledButton({ children, title = "Not implemented in this MVP" }) {
  return (
    <button
      type="button"
      disabled
      title={title}
      className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-surface-muted px-4 py-2.5 text-sm font-semibold text-text-secondary opacity-70"
    >
      {children}
    </button>
  );
}

