export default function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-3 leading-7 text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </div>
  );
}

