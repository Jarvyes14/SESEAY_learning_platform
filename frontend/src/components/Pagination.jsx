export default function Pagination({ meta, onChange }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-text-secondary">{meta.total} registros · Página {meta.page} de {pages}</span><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>Anterior</button><button type="button" className="btn-secondary" disabled={meta.page >= pages} onClick={() => onChange(meta.page + 1)}>Siguiente</button></div></div>;
}
