export default function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5 sm:pb-7">
      <div className="min-w-0 max-w-3xl flex-[1_1_28rem]">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title mt-2 font-display font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-3 leading-7 text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="action-group">{actions}</div>}
    </div>
  );
}

