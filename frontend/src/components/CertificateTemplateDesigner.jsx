import useDialog from "../hooks/useDialog.js";
import useUnsavedChanges from "../hooks/useUnsavedChanges.js";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { FileImage, Move, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import EmptyState from "./EmptyState.jsx";
import { api, assetUrl } from "../lib/api.js";
import { certificateCanvasStyle, certificateNameStyle } from "../lib/certificate-preview.js";

const EMPTY_TEMPLATE = {
  name: "",
  backgroundImage: "",
  nameX: 50,
  nameY: 52,
  nameWidth: 60,
  fontSize: 42,
  textColor: "#1F2937",
  fontFamily: "serif"
};

export default function CertificateTemplateDesigner({ templates, setTemplates, setError, setSuccess }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);

  async function saveTemplate(form) {
    try {
      if (editing.id && form.backgroundImage === editing.backgroundImage) delete form.backgroundImage;
      const result = await api(editing.id ? `/certificates/templates/${editing.id}` : "/certificates/templates", {
        method: editing.id ? "PATCH" : "POST",
        body: JSON.stringify(form)
      });
      setTemplates((current) => editing.id
        ? current.map((template) => template.id === editing.id ? result.data : template)
        : [result.data, ...current]);
      setEditing(null);
      setError("");
      setSuccess(editing.id ? "Plantilla actualizada correctamente." : "Plantilla creada correctamente.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeTemplate(template) {
    if (!window.confirm(`¿Eliminar la plantilla “${template.name}”?`)) return;
    try {
      await api(`/certificates/templates/${template.id}`, { method: "DELETE" });
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setSuccess("Plantilla eliminada.");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function open(template = EMPTY_TEMPLATE) {
    setEditing({ ...template });
    setSuccess("");
  }

  return (
    <section className="mt-8" aria-labelledby="template-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Diseño</p>
          <h2 id="template-heading" className="mt-2 text-2xl font-bold">Creador de plantillas</h2>
          <p className="mt-2 text-sm text-text-secondary">Sube el certificado en blanco y define dónde aparecerá el nombre de la persona.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">Disponible para cursos</span>
          <button type="button" className="btn-primary" disabled={!can(user, "certificate_templates.create")} onClick={() => open()}><Plus size={17} /> Nueva plantilla</button>
        </div>
      </div>

      {templates.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="panel overflow-hidden">
              <CertificatePreview template={template} />
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{template.name}</h3>
                  <p className="mt-1 text-xs text-text-secondary">Actualizada {new Date(template.updatedAt).toLocaleDateString("es-MX")}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary px-3" disabled={!can(user, "certificate_templates.edit")} onClick={() => open(template)} aria-label={`Editar ${template.name}`}><Pencil size={16} /></button>
                  <button type="button" className="btn-secondary px-3 text-error" disabled={!can(user, "certificate_templates.delete")} onClick={() => removeTemplate(template)} aria-label={`Eliminar ${template.name}`}><Trash2 size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Aún no hay plantillas" description="Crea la primera plantilla cargando un certificado en blanco." action={<button type="button" className="btn-primary" disabled={!can(user, "certificate_templates.create")} onClick={() => open()}><FileImage size={16} /> Crear plantilla</button>} />
      )}

      {editing && <TemplateEditor initialValue={editing} onClose={() => setEditing(null)} onSave={saveTemplate} onError={setError} />}
    </section>
  );
}

function TemplateEditor({ initialValue, onClose, onSave, onError }) {
  const [form, setForm] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initialValue);
  const confirmDiscard = useUnsavedChanges(dirty);
  const close = () => { if (!saving && confirmDiscard()) onClose(); };
  const dialogRef = useDialog(true, close);

  function updatePosition(event) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nameX = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const nameY = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    setForm((current) => ({ ...current, nameX: Number(nameX.toFixed(1)), nameY: Number(nameY.toFixed(1)) }));
  }

  function loadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      onError("La plantilla debe ser una imagen PNG, JPG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      onError("La imagen no puede superar 4 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, backgroundImage: reader.result }));
      onError("");
    };
    reader.onerror = () => onError("No se pudo leer la imagen seleccionada.");
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.backgroundImage) {
      onError("Carga una imagen para usarla como certificado en blanco.");
      return;
    }
    setSaving(true);
    await onSave({
      name: form.name,
      backgroundImage: form.backgroundImage,
      nameX: Number(form.nameX),
      nameY: Number(form.nameY),
      nameWidth: Number(form.nameWidth),
      fontSize: Number(form.fontSize),
      textColor: form.textColor,
      fontFamily: form.fontFamily
    });
    setSaving(false);
  }

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-overlay/80 p-3 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <form className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)]" onSubmit={submit}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6 py-4">
          <div><p className="eyebrow">Vista previa editable</p><h2 id="editor-title" className="mt-1 text-xl font-bold">{initialValue.id ? "Editar plantilla" : "Nueva plantilla"}</h2></div>
          <button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-muted" onClick={close} aria-label="Cerrar editor"><X size={21} /></button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 bg-surface-muted p-3 sm:p-5 md:p-8">
            {form.backgroundImage ? (
              <div ref={previewRef} className="relative mx-auto max-w-4xl overflow-hidden rounded-md border border-border bg-white shadow-lg" style={certificateCanvasStyle} onPointerDown={updatePosition}>
                <img src={assetUrl(form.backgroundImage)} alt="Vista previa de la plantilla" className="block h-auto w-full select-none" draggable="false" />
                <div
                  className="absolute flex min-h-[3em] touch-none select-none items-center justify-center border-2 border-dashed border-primary bg-primary/5 px-2 text-center font-bold leading-tight"
                  style={certificateNameStyle(form)}
                  onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); updatePosition(event); }}
                  onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePosition(event); }}
                >
                  <Move size={18} className="absolute -right-3 -top-3 rounded-full bg-primary p-0.5 text-inverse" />
                  NOMBRE DE LA PERSONA
                </div>
              </div>
            ) : (
              <label className="mx-auto grid min-h-40 aspect-[1.414/1] max-w-4xl p-3 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-surface text-center hover:border-primary">
                <span><FileImage className="mx-auto text-primary" size={38} /><strong className="mt-4 block">Sube el certificado en blanco</strong><span className="mt-2 block text-sm text-text-secondary">PNG, JPG o WebP · máximo 4 MB</span></span>
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={loadImage} aria-label="Imagen del certificado" />
              </label>
            )}
            {form.backgroundImage && <p className="mt-4 text-center text-xs text-text-secondary">Arrastra el área punteada o haz clic en cualquier punto para colocar el nombre.</p>}
          </div>

          <aside className="min-w-0 space-y-5 border-t border-border p-4 sm:p-6 lg:border-l lg:border-t-0">
            <Field label="Nombre de la plantilla"><input className="input-field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Certificado institucional" minLength={3} required /></Field>
            <div><p className="mb-2 block text-sm font-semibold">Imagen de fondo</p><label className="btn-secondary cursor-pointer"><FileImage size={16} />Seleccionar imagen<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={loadImage} aria-label="Reemplazar imagen del certificado" /></label><p className="mt-2 text-xs text-text-secondary">PNG, JPG o WebP · máximo 4 MB</p></div>
            <Range label={`Posición horizontal: ${form.nameX}%`} min="0" max="100" step="0.5" value={form.nameX} onChange={(nameX) => setForm({ ...form, nameX })} />
            <Range label={`Posición vertical: ${form.nameY}%`} min="0" max="100" step="0.5" value={form.nameY} onChange={(nameY) => setForm({ ...form, nameY })} />
            <Range label={`Ancho del área: ${form.nameWidth}%`} min="15" max="100" step="1" value={form.nameWidth} onChange={(nameWidth) => setForm({ ...form, nameWidth })} />
            <Range label={`Tamaño del texto: ${form.fontSize}px`} min="12" max="120" step="1" value={form.fontSize} onChange={(fontSize) => setForm({ ...form, fontSize })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color"><input className="h-11 w-full cursor-pointer rounded-md border border-border bg-surface p-1" type="color" value={form.textColor} onChange={(event) => setForm({ ...form, textColor: event.target.value.toUpperCase() })} /></Field>
              <Field label="Tipografía"><select className="input-field" value={form.fontFamily} onChange={(event) => setForm({ ...form, fontFamily: event.target.value })}><option value="serif">Serif</option><option value="sans-serif">Sans serif</option><option value="cursive">Manuscrita</option></select></Field>
            </div>
          </aside>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-border px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" className="btn-secondary" onClick={close}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}><Save size={17} /> {saving ? "Guardando…" : "Guardar plantilla"}</button>
        </footer>
      </form>
    </div>
  );
}

function CertificatePreview({ template }) {
  return (
    <div className="relative overflow-hidden bg-white" style={certificateCanvasStyle}>
      <img loading="lazy" decoding="async" src={assetUrl(template.backgroundImage)} alt={`Plantilla ${template.name}`} className="block h-auto w-full" />
      <span className="absolute flex items-center justify-center text-center font-bold leading-tight" style={certificateNameStyle(template)}>NOMBRE DE LA PERSONA</span>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>;
}

function Range({ label, value, onChange, ...props }) {
  return <Field label={label}><input className="w-full accent-primary" type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} {...props} /></Field>;
}
