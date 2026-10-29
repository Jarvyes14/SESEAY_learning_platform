import useDialog from "../../hooks/useDialog.js";
import useUnsavedChanges from "../../hooks/useUnsavedChanges.js";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  GripVertical,
  Image as ImageIcon,
  PanelsTopLeft,
  PlayCircle,
  Plus,
  Save,
  Send,
  Settings2,
  Trash2,
  Video,
  X
} from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api.js";
import { ContentTypeModal } from "./ActivityComposer.jsx";
import { CONTENT_TYPES } from "./activityTypes.js";

const MODULAR_TYPES = CONTENT_TYPES.filter((item) => item.selectable !== false && !["ASSIGNMENT", "FINAL_EXAM"].includes(item.type));

function getDefinition(type) {
  return CONTENT_TYPES.find((item) => item.type === type) ?? CONTENT_TYPES[0];
}

function emptyForm(type, initialModuleType = null) {
  return {
    title: "",
    instructions: "",
    type,
    points: 0,
    minimumReadSeconds: 30,
    minimumWatchPercent: 80,
    maxAttempts: 1,
    videoUrl: "",
    videoDurationSeconds: 60,
    readingBody: "",
    imageUrl: "",
    imageAlt: "",
    imageCaption: "",
    externalUrl: "",
    externalLabel: "Abrir recurso",
    externalDescription: "",
    embedUrl: "",
    embedTitle: "",
    embedHeight: 520,
    scenario: "",
    questions: [{ prompt: "", options: ["", ""], correctIndex: 0, points: 1 }],
    statements: [{ prompt: "", correctAnswer: true, points: 1 }],
    pairs: [{ left: "", right: "" }, { left: "", right: "" }],
    orderingItems: ["", ""],
    sentences: [{ prompt: "", answer: "", caseSensitive: false, points: 1 }],
    interactiveLayout: "ACCORDION",
    interactiveItems: [{ title: "", body: "" }, { title: "", body: "" }],
    sections: [{ text: "", incorrect: false }, { text: "", incorrect: true }],
    fields: [{ label: "", type: "textarea", required: true }],
    modules: type === "COMPOSITE" && initialModuleType ? [emptyModule(initialModuleType)] : []
  };
}

function moduleId() {
  return globalThis.crypto?.randomUUID?.() ?? `module-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyModule(type) {
  return { ...emptyForm(type), id: moduleId(), title: "" };
}

function formFromActivity(activity, preserveSingleType = false) {
  if (!preserveSingleType && activity.type !== "COMPOSITE" && MODULAR_TYPES.some((item) => item.type === activity.type)) {
    const module = {
      ...formFromActivity(activity, true),
      id: `legacy-${activity.id}`,
      title: ""
    };
    return {
      ...emptyForm("COMPOSITE"),
      title: activity.title ?? "",
      instructions: activity.instructions ?? "",
      maxAttempts: activity.maxAttempts ?? 1,
      modules: [module]
    };
  }
  const form = emptyForm(activity.type);
  const content = activity.content ?? {};
  if (activity.type === "COMPOSITE") {
    return {
      ...form,
      title: activity.title ?? "",
      instructions: activity.instructions ?? "",
      maxAttempts: activity.maxAttempts ?? 1,
      modules: (content.modules ?? []).map(formFromModule)
    };
  }
  return {
    ...form,
    title: activity.title ?? "",
    instructions: activity.instructions ?? "",
    points: activity.points ?? 0,
    minimumReadSeconds: activity.minimumReadSeconds ?? 30,
    minimumWatchPercent: activity.minimumWatchPercent ?? 80,
    maxAttempts: activity.maxAttempts ?? 1,
    videoUrl: content.url ?? "",
    videoDurationSeconds: content.durationSeconds ?? 60,
    readingBody: content.body ?? "",
    imageUrl: content.url ?? "",
    imageAlt: content.alt ?? "",
    imageCaption: content.caption ?? "",
    externalUrl: content.url ?? "",
    externalLabel: content.label ?? "Abrir recurso",
    externalDescription: content.description ?? "",
    embedUrl: content.url ?? "",
    embedTitle: content.title ?? "",
    embedHeight: content.height ?? 520,
    scenario: content.scenario ?? "",
    questions: content.questions?.length ? content.questions : form.questions,
    statements: content.statements?.length ? content.statements : form.statements,
    pairs: content.pairs?.length ? content.pairs : form.pairs,
    orderingItems: content.items?.length ? content.items : form.orderingItems,
    sentences: content.sentences?.length ? content.sentences : form.sentences,
    interactiveLayout: content.layout ?? "ACCORDION",
    interactiveItems: content.items?.length ? content.items : form.interactiveItems,
    sections: content.sections?.length ? content.sections : form.sections,
    fields: content.fields?.length ? content.fields : form.fields
  };
}

function formFromModule(module) {
  return {
    ...formFromActivity({
      type: module.type,
      title: module.title ?? "",
      instructions: "",
      content: module.content,
      minimumReadSeconds: module.minimumReadSeconds,
      minimumWatchPercent: module.minimumWatchPercent
    }, true),
    id: module.id
  };
}

function contentFromForm(form) {
  if (form.type === "YOUTUBE_VIDEO") return { url: form.videoUrl, durationSeconds: Number(form.videoDurationSeconds) };
  if (form.type === "READING") return { body: form.readingBody };
  if (form.type === "IMAGE") return { url: form.imageUrl, alt: form.imageAlt, caption: form.imageCaption };
  if (form.type === "EXTERNAL_LINK") return { url: form.externalUrl, label: form.externalLabel, description: form.externalDescription };
  if (form.type === "EMBEDDED_CONTENT") return { url: form.embedUrl, title: form.embedTitle, height: Number(form.embedHeight) };
  if (["QUESTIONS", "FINAL_EXAM"].includes(form.type)) return { questions: form.questions.map((question) => ({ ...question, points: Number(question.points), correctIndex: Number(question.correctIndex) })) };
  if (form.type === "CASE_STUDY") return { scenario: form.scenario, questions: form.questions.map((question) => ({ ...question, points: Number(question.points), correctIndex: Number(question.correctIndex) })) };
  if (form.type === "TRUE_FALSE") return { statements: form.statements.map((statement) => ({ ...statement, points: Number(statement.points) })) };
  if (form.type === "MATCHING") return { pairs: form.pairs };
  if (form.type === "ORDERING") return { items: form.orderingItems };
  if (form.type === "FILL_BLANKS") return { sentences: form.sentences.map((sentence) => ({ ...sentence, points: Number(sentence.points) })) };
  if (form.type === "INTERACTIVE_CONTENT") return { layout: form.interactiveLayout, items: form.interactiveItems };
  if (form.type === "INCORRECT_SECTION") return { sections: form.sections };
  if (form.type === "ASSIGNMENT") return { fields: form.fields };
  return {};
}

function modulePayload(module) {
  return {
    id: module.id,
    type: module.type,
    title: module.title,
    content: contentFromForm(module),
    minimumReadSeconds: Number(module.minimumReadSeconds),
    minimumWatchPercent: Number(module.minimumWatchPercent)
  };
}

function modulePoints(module) {
  if (["QUESTIONS", "CASE_STUDY"].includes(module.type)) return module.questions.reduce((total, question) => total + Number(question.points || 1), 0);
  if (module.type === "TRUE_FALSE") return module.statements.reduce((total, statement) => total + Number(statement.points || 1), 0);
  if (module.type === "FILL_BLANKS") return module.sentences.reduce((total, sentence) => total + Number(sentence.points || 1), 0);
  if (module.type === "MATCHING") return module.pairs.length;
  if (module.type === "ORDERING") return module.orderingItems.length;
  if (module.type === "INCORRECT_SECTION") return 1;
  return 0;
}

function activityPayload(form, topicId) {
  const content = form.type === "COMPOSITE"
    ? { modules: form.modules.map(modulePayload) }
    : contentFromForm(form);
  return {
    ...(topicId ? { topicId } : {}),
    title: form.title,
    instructions: form.instructions || null,
    type: form.type,
    content,
    points: form.type === "COMPOSITE" ? form.modules.reduce((total, module) => total + modulePoints(module), 0) : Number(form.points),
    minimumReadSeconds: Number(form.minimumReadSeconds),
    minimumWatchPercent: Number(form.minimumWatchPercent),
    maxAttempts: Number(form.maxAttempts) || null
  };
}

function requestMessage(error) {
  const fieldErrors = error.details?.fieldErrors;
  const details = fieldErrors ? Object.values(fieldErrors).flat().join(" ") : "";
  return details ? `${error.message}: ${details}` : error.message;
}

function isScored(type) {
  return ["COMPOSITE", "QUESTIONS", "INCORRECT_SECTION", "ASSIGNMENT", "FINAL_EXAM", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"].includes(type);
}

export default function StudentActivityEditor({ topicId, type, initialModuleType, activity, onSaved, onCancel, onError }) {
  const [form, setForm] = useState(() => activity ? formFromActivity(activity) : emptyForm(type, initialModuleType));
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const confirmDiscard = useUnsavedChanges(JSON.stringify(form) !== baseline);
  const cancel = () => { if (!saving && confirmDiscard()) onCancel(); };
  const dialogRef = useDialog(true, cancel);
  const [saving, setSaving] = useState(false);
  const [activeItem, setActiveItem] = useState(0);
  const definition = getDefinition(form.type);
  const Icon = definition.icon;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const path = activity ? `/activities/${activity.id}` : "/activities";
      await api(path, {
        method: activity ? "PATCH" : "POST",
        body: JSON.stringify(activityPayload(form, activity ? null : topicId))
      });
      setBaseline(JSON.stringify(form));
      onSaved();
    } catch (error) {
      onError(requestMessage(error));
      setSaving(false);
    }
  }

  return (
    <form ref={dialogRef} onSubmit={submit} className="fixed inset-0 z-50 overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label="Editor de actividad">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={cancel} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-muted hover:text-text-primary"><X size={18} />Volver a la lección</button>
          <div className="hidden items-center gap-2 text-xs text-text-secondary lg:flex"><span className="size-2 rounded-full bg-success" /><strong className="text-text-primary">Editando vista del participante</strong><span>·</span><span>{definition.label}</span></div>
          <button type="submit" className="btn-primary px-4 py-2" disabled={saving}><Save size={16} />{saving ? "Guardando..." : activity ? "Guardar cambios" : "Agregar a la lección"}</button>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100dvh-65px)] w-full min-w-0 max-w-6xl p-4 sm:p-6 xl:p-8">
        <div className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2 text-primary"><Icon size={16} /><p className="eyebrow">{definition.label}</p><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Editable</span></div>
          <InlineTextarea
            ariaLabel="Título de la actividad"
            value={form.title}
            onChange={(title) => setForm({ ...form, title })}
            placeholder="Título de la actividad"
            className="editable-title page-title mt-2 font-display font-bold"
            required
          />
          <InlineTextarea
            ariaLabel="Instrucciones para participantes"
            value={form.instructions}
            onChange={(instructions) => setForm({ ...form, instructions })}
            placeholder="Agrega aquí las instrucciones que verán los participantes..."
            className="mt-3 min-h-16 text-base leading-7 text-text-secondary"
          />
        </div>

        <div className="mt-7">
          <EditableActivityBody form={form} setForm={setForm} activeItem={activeItem} setActiveItem={setActiveItem} />
        </div>

        <details className="panel mt-8 overflow-hidden">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4 font-semibold"><span className="flex items-center gap-2"><Settings2 size={17} className="text-primary" />Configuración de la actividad</span><span className="text-xs font-normal text-text-secondary">Finalización, puntuación e intentos</span></summary>
          <div className="grid gap-4 border-t border-border bg-surface-muted p-5 sm:grid-cols-2">
            {form.type === "READING" && <Field label="Tiempo mínimo de lectura (segundos)" type="number" min="0" value={form.minimumReadSeconds} onChange={(minimumReadSeconds) => setForm({ ...form, minimumReadSeconds: Number(minimumReadSeconds) })} />}
            {form.type === "YOUTUBE_VIDEO" && <><Field label="Duración del video (segundos)" type="number" min="1" value={form.videoDurationSeconds} onChange={(videoDurationSeconds) => setForm({ ...form, videoDurationSeconds: Number(videoDurationSeconds) })} /><Field label="Porcentaje mínimo de reproducción" type="number" min="1" max="100" value={form.minimumWatchPercent} onChange={(minimumWatchPercent) => setForm({ ...form, minimumWatchPercent: Number(minimumWatchPercent) })} /></>}
            {form.type === "EMBEDDED_CONTENT" && <Field label="Altura del marco (píxeles)" type="number" min="240" max="1200" value={form.embedHeight} onChange={(embedHeight) => setForm({ ...form, embedHeight: Number(embedHeight) })} />}
            {isScored(form.type) && <>{form.type !== "COMPOSITE" && <Field label="Puntos de la actividad" type="number" min="0" value={form.points} onChange={(points) => setForm({ ...form, points: Number(points) })} />}<Field label="Intentos máximos" type="number" min="1" value={form.maxAttempts} onChange={(maxAttempts) => setForm({ ...form, maxAttempts: Number(maxAttempts) })} /></>}
          </div>
        </details>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={cancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}><Save size={16} />{saving ? "Guardando..." : activity ? "Guardar cambios" : "Agregar a la lección"}</button>
        </div>
      </main>
    </form>
  );
}

function EditableActivityBody({ form, setForm, activeItem, setActiveItem }) {
  if (form.type === "COMPOSITE") {
    return <CompositeEditor form={form} setForm={setForm} />;
  }
  if (form.type === "READING") {
    return <div className="panel p-7"><BookOpen className="text-primary" /><InlineTextarea ariaLabel="Contenido de texto" value={form.readingBody} onChange={(readingBody) => setForm({ ...form, readingBody })} placeholder="Escribe la lección exactamente como la leerán los participantes..." className="mt-5 min-h-72 text-base leading-8" required /><div className="mt-8 border-t border-border pt-5"><p className="text-sm text-text-secondary">Tiempo mínimo de lectura: {form.minimumReadSeconds} segundos</p><button type="button" className="btn-primary mt-4 pointer-events-none opacity-60"><CheckCircle2 size={16} />He leído y comprendido este contenido</button></div></div>;
  }

  if (form.type === "YOUTUBE_VIDEO") {
    return <div><div className="grid min-h-60 place-items-center overflow-hidden rounded-lg border border-border bg-overlay p-4 sm:aspect-video sm:p-8 text-inverse"><div className="w-full max-w-xl text-center"><Video className="mx-auto" size={36} /><p className="mt-3 text-lg font-bold">Lección en video</p><input aria-label="URL del video de YouTube" className="mt-4 w-full rounded-md border border-inverse/30 bg-inverse/10 px-4 py-3 text-center text-sm text-inverse placeholder:text-inverse/60 focus:border-inverse" type="url" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="URL del video de YouTube" required /></div></div><div className="panel mt-5 p-5"><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-2/5 rounded-full bg-primary" /></div><p className="mt-3 text-xs text-text-secondary">Los participantes deben ver {form.minimumWatchPercent}% de este video de {form.videoDurationSeconds} segundos.</p><button type="button" className="btn-primary mt-4 pointer-events-none opacity-60"><PlayCircle size={16} />Confirmar el porcentaje visto</button></div></div>;
  }

  if (form.type === "IMAGE") {
    return <figure className="panel overflow-hidden"><div className="grid min-h-72 place-items-center bg-surface-muted p-5">{form.imageUrl ? <img src={form.imageUrl} alt={form.imageAlt || "Vista previa"} className="max-h-[620px] w-full rounded-lg object-contain" /> : <div className="text-center text-text-secondary"><ImageIcon className="mx-auto" size={38} /><p className="mt-3 font-semibold">Agrega la URL de una imagen o captura</p></div>}</div><figcaption className="space-y-3 border-t border-border p-5"><Field label="URL de la imagen" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} placeholder="/course-assets/captura.png" required /><Field label="Texto alternativo" value={form.imageAlt} onChange={(imageAlt) => setForm({ ...form, imageAlt })} placeholder="Describe lo que muestra la imagen" required /><Field label="Pie de imagen" value={form.imageCaption} onChange={(imageCaption) => setForm({ ...form, imageCaption })} placeholder="Explica qué debe observar el participante" /></figcaption></figure>;
  }

  if (form.type === "EXTERNAL_LINK") {
    return <div className="panel p-7"><ExternalLink className="text-primary" /><InlineInput ariaLabel="Texto del botón" value={form.externalLabel} onChange={(externalLabel) => setForm({ ...form, externalLabel })} placeholder="Título del recurso" className="mt-4 text-xl font-bold" /><InlineTextarea ariaLabel="Descripción del recurso" value={form.externalDescription} onChange={(externalDescription) => setForm({ ...form, externalDescription })} placeholder="Explica por qué los participantes deben abrir este recurso..." className="mt-2 min-h-20 leading-7 text-text-secondary" /><label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">URL de destino</span><input aria-label="URL del recurso" className="input-field" type="url" value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} placeholder="https://example.org/resource" required /></label><span className="btn-secondary mt-5 pointer-events-none"><ExternalLink size={16} />{form.externalLabel || "Abrir recurso externo"}</span><div className="mt-6 border-t border-border pt-5"><button type="button" className="btn-primary pointer-events-none opacity-60"><CheckCircle2 size={16} />Marcar recurso como revisado</button></div></div>;
  }

  if (form.type === "EMBEDDED_CONTENT") {
    return <div><div className="grid min-h-[360px] place-items-center overflow-hidden rounded-lg border border-border bg-surface p-8 text-center"><div className="w-full max-w-xl"><PanelsTopLeft className="mx-auto text-primary" size={32} /><InlineInput ariaLabel="Título del contenido incrustado" value={form.embedTitle} onChange={(embedTitle) => setForm({ ...form, embedTitle })} placeholder="Título del contenido incrustado" className="mt-4 text-xl font-bold text-center" /><input aria-label="URL del contenido incrustado" className="input-field mt-4 text-center" type="url" value={form.embedUrl} onChange={(event) => setForm({ ...form, embedUrl: event.target.value })} placeholder="Pega la URL del contenido incrustado" required /><p className="mt-3 text-xs text-text-secondary">El recurso se mostrará aquí para los participantes.</p></div></div><button type="button" className="btn-primary mt-5 pointer-events-none opacity-60"><CheckCircle2 size={16} />Marcar contenido incrustado como revisado</button></div>;
  }

  if (form.type === "INTERACTIVE_CONTENT") {
    return <InteractiveEditor form={form} setForm={setForm} activeItem={activeItem} setActiveItem={setActiveItem} />;
  }

  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(form.type)) {
    return <QuestionEditor form={form} setForm={setForm} />;
  }

  if (form.type === "TRUE_FALSE") {
    return <TrueFalseEditor form={form} setForm={setForm} />;
  }

  if (form.type === "MATCHING") {
    return <MatchingEditor form={form} setForm={setForm} />;
  }

  if (form.type === "ORDERING") {
    return <OrderingEditor form={form} setForm={setForm} />;
  }

  if (form.type === "FILL_BLANKS") {
    return <FillBlankEditor form={form} setForm={setForm} />;
  }

  if (form.type === "INCORRECT_SECTION") {
    return <IncorrectSectionEditor form={form} setForm={setForm} />;
  }

  if (form.type === "ASSIGNMENT") {
    return <AssignmentEditor form={form} setForm={setForm} />;
  }

  return null;
}

function CompositeEditor({ form, setForm }) {
  const [picker, setPicker] = useState(null);

  function addModule(type) {
    const insertAt = (picker?.afterIndex ?? form.modules.length - 1) + 1;
    const modules = [...form.modules];
    modules.splice(insertAt, 0, emptyModule(type));
    setForm({ ...form, modules });
    setPicker(null);
  }

  function updateModule(id, nextModule) {
    setForm({ ...form, modules: form.modules.map((module) => module.id === id ? nextModule : module) });
  }

  function removeModule(id) {
    setForm({ ...form, modules: form.modules.filter((module) => module.id !== id) });
  }

  function moveModule(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= form.modules.length) return;
    const modules = [...form.modules];
    [modules[index], modules[target]] = [modules[target], modules[index]];
    setForm({ ...form, modules });
  }

  return (
    <div className="space-y-3">
      {!form.modules.length && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center">
          <Plus className="mx-auto text-primary" size={28} />
          <h3 className="mt-3 font-bold">Construye esta actividad bloque por bloque</h3>
          <p className="mt-1 text-sm text-text-secondary">Combina texto, video, enlaces, secciones interactivas y preguntas en cualquier orden.</p>
        </div>
      )}
      {form.modules.map((module, index) => (
        <div key={module.id}>
          <ModuleCard
            module={module}
            index={index}
            total={form.modules.length}
            onChange={(nextModule) => updateModule(module.id, nextModule)}
            onRemove={() => removeModule(module.id)}
            onMove={(direction) => moveModule(index, direction)}
          />
          <button type="button" onClick={() => setPicker({ afterIndex: index })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/35 bg-surface px-4 py-3.5 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"><Plus size={17} />Agregar contenido</button>
        </div>
      ))}
      {!form.modules.length && <button type="button" onClick={() => setPicker({ afterIndex: -1 })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/35 bg-surface px-4 py-3.5 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"><Plus size={17} />Agregar contenido</button>}
      <ContentTypeModal
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        onSelect={addModule}
        types={MODULAR_TYPES}
        title="Agregar un bloque a esta actividad"
        description="Elige el siguiente elemento de la experiencia. Podrás configurarlo inmediatamente después de agregarlo."
      />
    </div>
  );
}

function ModuleCard({ module, index, total, onChange, onRemove, onMove }) {
  const [activeItem, setActiveItem] = useState(0);
  const definition = getDefinition(module.type);
  const Icon = definition.icon;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-muted px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={18} /></span>
        <div className="min-w-0 flex-[1_1_8rem]">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-text-secondary">Bloque {index + 1} · {definition.label}</p>
          <InlineInput ariaLabel={`Título del bloque ${index + 1}`} value={module.title} onChange={(title) => onChange({ ...module, title })} placeholder="Título opcional del bloque" className="font-semibold" required={false} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-30" aria-label="Subir bloque"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-30" aria-label="Bajar bloque"><ArrowDown size={15} /></button>
          <button type="button" onClick={onRemove} className="rounded-md border border-border p-2 text-text-secondary hover:border-error hover:text-error" aria-label="Eliminar bloque"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="[&_.pointer-events-none]:hidden">
          <EditableActivityBody form={module} setForm={onChange} activeItem={activeItem} setActiveItem={setActiveItem} />
        </div>
        <ModuleSettings module={module} onChange={onChange} />
      </div>
    </section>
  );
}

function ModuleSettings({ module, onChange }) {
  const hasSettings = ["READING", "YOUTUBE_VIDEO", "EMBEDDED_CONTENT"].includes(module.type);
  if (!hasSettings) return null;
  return (
    <details className="mt-5 rounded-lg border border-border bg-surface-muted">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-text-secondary">Configuración del bloque</summary>
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
        {module.type === "READING" && <Field label="Tiempo mínimo de lectura (segundos)" type="number" min="0" value={module.minimumReadSeconds} onChange={(minimumReadSeconds) => onChange({ ...module, minimumReadSeconds: Number(minimumReadSeconds) })} />}
        {module.type === "YOUTUBE_VIDEO" && <><Field label="Duración del video (segundos)" type="number" min="1" value={module.videoDurationSeconds} onChange={(videoDurationSeconds) => onChange({ ...module, videoDurationSeconds: Number(videoDurationSeconds) })} /><Field label="Porcentaje mínimo de reproducción" type="number" min="1" max="100" value={module.minimumWatchPercent} onChange={(minimumWatchPercent) => onChange({ ...module, minimumWatchPercent: Number(minimumWatchPercent) })} /></>}
        {module.type === "EMBEDDED_CONTENT" && <Field label="Altura del marco (píxeles)" type="number" min="240" max="1200" value={module.embedHeight} onChange={(embedHeight) => onChange({ ...module, embedHeight: Number(embedHeight) })} />}
      </div>
    </details>
  );
}

function QuestionEditor({ form, setForm }) {
  const update = (index, patch) => setForm({ ...form, questions: form.questions.map((question, position) => position === index ? { ...question, ...patch } : question) });
  const remove = (index) => setForm({ ...form, questions: form.questions.filter((_, position) => position !== index) });
  return <div className="space-y-5">{form.type === "CASE_STUDY" && <div className="panel border-l-4 border-l-primary p-6"><p className="eyebrow">Escenario</p><InlineTextarea ariaLabel="Escenario y contexto" value={form.scenario} onChange={(scenario) => setForm({ ...form, scenario })} placeholder="Describe el caso que analizarán los participantes..." className="mt-3 min-h-36 leading-7" required /></div>}{form.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="panel relative p-6"><div className="flex items-start gap-3"><span className="mt-2 font-bold">{questionIndex + 1}.</span><InlineTextarea ariaLabel={`Pregunta ${questionIndex + 1}`} value={question.prompt} onChange={(prompt) => update(questionIndex, { prompt })} placeholder="Escribe aquí la pregunta..." className="min-h-12 flex-1 font-bold" required />{form.questions.length > 1 && <button type="button" onClick={() => remove(questionIndex)} className="rounded-md p-2 text-text-secondary hover:bg-error/10 hover:text-error" aria-label={`Eliminar pregunta ${questionIndex + 1}`}><Trash2 size={16} /></button>}</div><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className={`flex items-center gap-3 rounded-md border p-3 text-sm ${question.correctIndex === optionIndex ? "border-success bg-success/10" : "border-border"}`}><button type="button" onClick={() => update(questionIndex, { correctIndex: optionIndex })} className={`grid size-11 shrink-0 place-items-center rounded-full border ${question.correctIndex === optionIndex ? "border-success bg-success text-inverse" : "border-border"}`} aria-label={`Marcar la opción ${optionIndex + 1} como correcta`}>{question.correctIndex === optionIndex && <Check size={12} />}</button><input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-secondary" value={option} onChange={(event) => update(questionIndex, { options: question.options.map((item, position) => position === optionIndex ? event.target.value : item) })} placeholder={`Opción ${optionIndex + 1}`} required />{question.options.length > 2 && <button type="button" onClick={() => update(questionIndex, { options: question.options.filter((_, position) => position !== optionIndex), correctIndex: 0 })} className="text-text-secondary hover:text-error" aria-label={`Eliminar opción ${optionIndex + 1}`}><X size={15} /></button>}</div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button type="button" className="text-sm font-semibold text-primary" onClick={() => update(questionIndex, { options: [...question.options, ""] })}>+ Agregar opción</button><label className="flex items-center gap-2 text-xs font-semibold text-text-secondary">Puntos <input className="w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-text-primary" type="number" min="1" value={question.points} onChange={(event) => update(questionIndex, { points: Number(event.target.value) })} /></label></div></fieldset>)}<button type="button" className="btn-secondary w-full border-dashed" onClick={() => setForm({ ...form, questions: [...form.questions, { prompt: "", options: ["", ""], correctIndex: 0, points: 1 }] })}><Plus size={16} />Agregar pregunta</button><button type="button" className="btn-primary pointer-events-none opacity-60"><Send size={16} />Enviar {form.type === "FINAL_EXAM" ? "examen final" : "respuestas"}</button></div>;
}

function TrueFalseEditor({ form, setForm }) {
  const update = (index, patch) => setForm({ ...form, statements: form.statements.map((statement, position) => position === index ? { ...statement, ...patch } : statement) });
  return <div className="space-y-4">{form.statements.map((statement, index) => <fieldset key={index} className="panel p-5"><div className="flex items-start gap-3"><span className="mt-2 font-bold">{index + 1}.</span><InlineTextarea ariaLabel={`Afirmación ${index + 1}`} value={statement.prompt} onChange={(prompt) => update(index, { prompt })} placeholder="Escribe una afirmación de verdadero o falso..." className="min-h-12 flex-1 font-bold" required />{form.statements.length > 1 && <button type="button" onClick={() => setForm({ ...form, statements: form.statements.filter((_, position) => position !== index) })} className="p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>}</div><div className="mt-4 flex flex-wrap gap-3">{[true, false].map((answer) => <button key={String(answer)} type="button" onClick={() => update(index, { correctAnswer: answer })} className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${statement.correctAnswer === answer ? "border-success bg-success/10 font-semibold text-success" : "border-border"}`}><span className={`size-4 rounded-full border ${statement.correctAnswer === answer ? "border-success bg-success" : "border-border"}`} />{answer ? "Verdadero" : "Falso"}</button>)}</div><label className="mt-4 flex items-center gap-2 text-xs font-semibold text-text-secondary">Puntos <input className="w-20 rounded-md border border-border bg-surface px-2 py-1.5" type="number" min="1" value={statement.points} onChange={(event) => update(index, { points: Number(event.target.value) })} /></label></fieldset>)}<button type="button" className="btn-secondary w-full border-dashed" onClick={() => setForm({ ...form, statements: [...form.statements, { prompt: "", correctAnswer: true, points: 1 }] })}><Plus size={16} />Agregar afirmación</button><button type="button" className="btn-primary pointer-events-none opacity-60"><Send size={16} />Enviar respuestas</button></div>;
}

function MatchingEditor({ form, setForm }) {
  const update = (index, field, value) => setForm({ ...form, pairs: form.pairs.map((pair, position) => position === index ? { ...pair, [field]: value } : pair) });
  return <div><div className="panel grid gap-5 p-6 md:grid-cols-2"><div><h3 className="font-bold">Conceptos</h3>{form.pairs.map((pair, index) => <input key={index} aria-label={`Concepto ${index + 1}`} className="input-field mt-2" value={pair.left} onChange={(event) => update(index, "left", event.target.value)} placeholder={`Concepto ${index + 1}`} required />)}</div><div><h3 className="font-bold">Correspondencias correctas</h3>{form.pairs.map((pair, index) => <div key={index} className="mt-2 flex gap-2"><input aria-label={`Correspondencia ${index + 1}`} className="input-field" value={pair.right} onChange={(event) => update(index, "right", event.target.value)} placeholder={`Correspondencia ${index + 1}`} required />{form.pairs.length > 2 && <button type="button" onClick={() => setForm({ ...form, pairs: form.pairs.filter((_, position) => position !== index) })} className="p-2 text-text-secondary hover:text-error"><X size={16} /></button>}</div>)}</div></div><button type="button" className="btn-secondary mt-4 w-full border-dashed" onClick={() => setForm({ ...form, pairs: [...form.pairs, { left: "", right: "" }] })}><Plus size={16} />Agregar par para relacionar</button><button type="button" className="btn-primary mt-5 pointer-events-none opacity-60"><Send size={16} />Enviar correspondencias</button></div>;
}

function OrderingEditor({ form, setForm }) {
  return <div className="space-y-3">{form.orderingItems.map((item, index) => <div key={index} className="panel flex items-center gap-3 p-4"><GripVertical size={17} className="text-text-secondary" /><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><input aria-label={`Elemento de la secuencia ${index + 1}`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" value={item} onChange={(event) => setForm({ ...form, orderingItems: form.orderingItems.map((entry, position) => position === index ? event.target.value : entry) })} placeholder="Escribe un paso en el orden correcto" required />{form.orderingItems.length > 2 && <button type="button" onClick={() => setForm({ ...form, orderingItems: form.orderingItems.filter((_, position) => position !== index) })} className="p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>}</div>)}<button type="button" className="btn-secondary w-full border-dashed" onClick={() => setForm({ ...form, orderingItems: [...form.orderingItems, ""] })}><Plus size={16} />Agregar elemento a la secuencia</button><button type="button" className="btn-primary pointer-events-none opacity-60"><Send size={16} />Enviar orden</button></div>;
}

function FillBlankEditor({ form, setForm }) {
  const update = (index, patch) => setForm({ ...form, sentences: form.sentences.map((sentence, position) => position === index ? { ...sentence, ...patch } : sentence) });
  return <div><div className="panel space-y-5 p-6">{form.sentences.map((sentence, index) => <div key={index} className="border-b border-border pb-5 last:border-0 last:pb-0"><div className="flex items-start gap-3"><span className="mt-2 font-bold">{index + 1}.</span><InlineTextarea ariaLabel={`Enunciado para completar ${index + 1}`} value={sentence.prompt} onChange={(prompt) => update(index, { prompt })} placeholder="Escribe la frase y usa ____ para indicar el espacio en blanco." className="min-h-12 flex-1 font-semibold" required />{form.sentences.length > 1 && <button type="button" onClick={() => setForm({ ...form, sentences: form.sentences.filter((_, position) => position !== index) })} className="p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>}</div><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"><input className="input-field" disabled placeholder="Respuesta del participante" /><input aria-label={`Respuesta esperada ${index + 1}`} className="input-field" value={sentence.answer} onChange={(event) => update(index, { answer: event.target.value })} placeholder="Respuesta correcta" required /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sentence.caseSensitive} onChange={(event) => update(index, { caseSensitive: event.target.checked })} className="accent-primary" />Distinguir mayúsculas y minúsculas</label></div></div>)}</div><button type="button" className="btn-secondary mt-4 w-full border-dashed" onClick={() => setForm({ ...form, sentences: [...form.sentences, { prompt: "", answer: "", caseSensitive: false, points: 1 }] })}><Plus size={16} />Agregar enunciado</button><button type="button" className="btn-primary mt-5 pointer-events-none opacity-60"><Send size={16} />Enviar respuestas</button></div>;
}

function IncorrectSectionEditor({ form, setForm }) {
  const update = (index, patch) => setForm({ ...form, sections: form.sections.map((section, position) => position === index ? { ...section, ...patch } : section) });
  return <div className="space-y-3"><p className="text-sm text-text-secondary">Selecciona todas las secciones que contengan un error.</p>{form.sections.map((section, index) => <div key={index} className={`flex items-start gap-3 rounded-md border p-4 ${section.incorrect ? "border-success bg-success/10" : "border-border bg-surface"}`}><InlineTextarea ariaLabel={`Sección seleccionable ${index + 1}`} value={section.text} onChange={(text) => update(index, { text })} placeholder="Escribe una sección seleccionable..." className="min-h-12 flex-1 text-sm leading-6" required /><button type="button" onClick={() => update(index, { incorrect: !section.incorrect })} className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${section.incorrect ? "bg-success text-inverse" : "bg-surface-muted text-text-secondary"}`}>{section.incorrect ? "Sección con error" : "Marcar como error"}</button>{form.sections.length > 2 && <button type="button" onClick={() => setForm({ ...form, sections: form.sections.filter((_, position) => position !== index) })} className="p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>}</div>)}<button type="button" className="btn-secondary w-full border-dashed" onClick={() => setForm({ ...form, sections: [...form.sections, { text: "", incorrect: false }] })}><Plus size={16} />Agregar sección</button><button type="button" className="btn-primary pointer-events-none opacity-60"><Send size={16} />Enviar selección</button></div>;
}

function AssignmentEditor({ form, setForm }) {
  const update = (index, patch) => setForm({ ...form, fields: form.fields.map((field, position) => position === index ? { ...field, ...patch } : field) });
  return <div><div className="panel space-y-5 p-6">{form.fields.map((field, index) => <div key={index} className="rounded-lg border border-dashed border-border p-4"><InlineInput ariaLabel={`Etiqueta del campo ${index + 1}`} value={field.label} onChange={(label) => update(index, { label })} placeholder="Etiqueta del campo de respuesta" className="text-sm font-semibold" />{field.type === "textarea" ? <textarea className="input-field mt-2 min-h-32" disabled placeholder="Respuesta del participante" /> : <input className="input-field mt-2" type={field.type} disabled placeholder="Respuesta del participante" />}<div className="mt-3 flex flex-wrap items-center gap-3"><select aria-label={`Tipo de respuesta ${index + 1}`} className="rounded-md border border-border bg-surface px-3 py-2 text-xs" value={field.type} onChange={(event) => update(index, { type: event.target.value })}><option value="text">Texto corto</option><option value="textarea">Texto largo</option><option value="number">Número</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} className="accent-primary" />Obligatoria</label>{form.fields.length > 1 && <button type="button" onClick={() => setForm({ ...form, fields: form.fields.filter((_, position) => position !== index) })} className="ml-auto p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>}</div></div>)}</div><button type="button" className="btn-secondary mt-4 w-full border-dashed" onClick={() => setForm({ ...form, fields: [...form.fields, { label: "", type: "textarea", required: true }] })}><Plus size={16} />Agregar campo de respuesta</button><button type="button" className="btn-primary mt-5 pointer-events-none opacity-60"><FileText size={16} />Enviar tarea para revisión</button></div>;
}

function InteractiveEditor({ form, setForm, activeItem, setActiveItem }) {
  const update = (index, patch) => setForm({ ...form, interactiveItems: form.interactiveItems.map((item, position) => position === index ? { ...item, ...patch } : item) });
  const remove = (index) => {
    setForm({ ...form, interactiveItems: form.interactiveItems.filter((_, position) => position !== index) });
    setActiveItem(0);
  };
  const cards = form.interactiveLayout === "CARDS";
  const tabs = form.interactiveLayout === "TABS";
  return <div><div className="mb-4 flex justify-end"><label className="flex items-center gap-2 text-xs font-semibold text-text-secondary">Presentación <select className="rounded-md border border-border bg-surface px-3 py-2 text-text-primary" value={form.interactiveLayout} onChange={(event) => { setForm({ ...form, interactiveLayout: event.target.value }); setActiveItem(0); }}><option value="ACCORDION">Acordeón</option><option value="TABS">Pestañas</option><option value="CARDS">Tarjetas</option></select></label></div>{tabs ? <div className="panel overflow-hidden"><div className="flex flex-wrap border-b border-border bg-surface-muted">{form.interactiveItems.map((item, index) => <button key={index} type="button" className={`px-5 py-3 text-sm font-semibold ${activeItem === index ? "bg-surface text-primary" : "text-text-secondary"}`} onClick={() => setActiveItem(index)}>{item.title || `Elemento ${index + 1}`}</button>)}</div>{form.interactiveItems[activeItem] && <div className="p-6"><InlineInput ariaLabel={`Título del elemento interactivo ${activeItem + 1}`} value={form.interactiveItems[activeItem].title} onChange={(title) => update(activeItem, { title })} placeholder="Título de la pestaña" className="font-bold" /><InlineTextarea ariaLabel={`Contenido del elemento interactivo ${activeItem + 1}`} value={form.interactiveItems[activeItem].body} onChange={(body) => update(activeItem, { body })} placeholder="Contenido de la pestaña..." className="mt-3 min-h-28 leading-7" required />{form.interactiveItems.length > 2 && <button type="button" className="mt-3 text-xs font-semibold text-error" onClick={() => remove(activeItem)}>Eliminar esta pestaña</button>}</div>}</div> : <div className={cards ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>{form.interactiveItems.map((item, index) => <article key={index} className="panel relative p-5">{form.interactiveItems.length > 2 && <button type="button" onClick={() => remove(index)} className="absolute right-3 top-3 p-2 text-text-secondary hover:text-error"><Trash2 size={15} /></button>}<InlineInput ariaLabel={`Título del elemento interactivo ${index + 1}`} value={item.title} onChange={(title) => update(index, { title })} placeholder={`Título del elemento ${index + 1}`} className="pr-8 font-bold" /><InlineTextarea ariaLabel={`Contenido del elemento interactivo ${index + 1}`} value={item.body} onChange={(body) => update(index, { body })} placeholder="Escribe el contenido..." className="mt-3 min-h-24 leading-7 text-text-secondary" required /></article>)}</div>}<button type="button" className="btn-secondary mt-4 w-full border-dashed" onClick={() => setForm({ ...form, interactiveItems: [...form.interactiveItems, { title: "", body: "" }] })}><Plus size={16} />Agregar elemento interactivo</button><button type="button" className="btn-primary mt-5 pointer-events-none opacity-60"><CheckCircle2 size={16} />Completar contenido interactivo</button></div>;
}

function InlineInput({ ariaLabel, value, onChange, placeholder, className = "", required = true }) {
  return <input aria-label={ariaLabel} className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition placeholder:text-text-secondary/70 hover:border-border hover:bg-surface focus:border-primary focus:bg-surface ${className}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />;
}

function InlineTextarea({ ariaLabel, value, onChange, placeholder, className = "", required = false }) {
  return <textarea aria-label={ariaLabel} className={`block w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition placeholder:text-text-secondary/70 hover:border-border hover:bg-surface focus:border-primary focus:bg-surface ${className}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />;
}

function Field({ label, value, onChange, type = "text", min, max }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} required /></label>;
}
