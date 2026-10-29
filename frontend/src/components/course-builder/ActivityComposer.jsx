import useDialog from "../../hooks/useDialog.js";
import {
  Check,
  ChevronDown,
  ExternalLink,
  GripVertical,
  PanelsTopLeft,
  Plus,
  Save,
  Trash2,
  Video,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { CONTENT_TYPES } from "./activityTypes.js";

function contentType(type) {
  return CONTENT_TYPES.find((item) => item.type === type) ?? CONTENT_TYPES[0];
}

export function ContentTypeModal({ open, onClose, onSelect, types = CONTENT_TYPES, title = "¿Qué deseas agregar?", description = "Elige un formato y configúralo en la vista previa." }) {
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  const groups = ["Contenido", "Comprobación", "Evaluaciones"];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-overlay/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="content-picker-title">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-5 md:px-8">
          <div>
            <p className="eyebrow">Agregar contenido</p>
            <h2 id="content-picker-title" className="mt-1 text-2xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-2 text-text-secondary transition hover:bg-surface-muted hover:text-text-primary" aria-label="Cerrar selector de contenido"><X size={20} /></button>
        </div>
        <div className="space-y-8 p-6 md:p-8">
          {groups.map((group) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-bold text-text-primary">{group}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {types.filter((item) => item.group === group && item.selectable !== false).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.type} type="button" onClick={() => onSelect(item.type)} className="group flex min-h-32 items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-panel focus-visible:border-primary">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-inverse"><Icon size={21} /></span>
                      <span><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{item.description}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function emptyForm(type) {
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
    fields: [{ label: "", type: "textarea", required: true }]
  };
}

function formFromActivity(activity) {
  const form = emptyForm(activity.type);
  const content = activity.content ?? {};
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

function activityPayload(form, topicId) {
  let content = {};
  if (form.type === "YOUTUBE_VIDEO") content = { url: form.videoUrl, durationSeconds: Number(form.videoDurationSeconds) };
  if (form.type === "READING") content = { body: form.readingBody };
  if (form.type === "EXTERNAL_LINK") content = { url: form.externalUrl, label: form.externalLabel, description: form.externalDescription };
  if (form.type === "EMBEDDED_CONTENT") content = { url: form.embedUrl, title: form.embedTitle, height: Number(form.embedHeight) };
  if (["QUESTIONS", "FINAL_EXAM"].includes(form.type)) content = { questions: form.questions.map((question) => ({ ...question, points: Number(question.points), correctIndex: Number(question.correctIndex) })) };
  if (form.type === "CASE_STUDY") content = { scenario: form.scenario, questions: form.questions.map((question) => ({ ...question, points: Number(question.points), correctIndex: Number(question.correctIndex) })) };
  if (form.type === "TRUE_FALSE") content = { statements: form.statements.map((statement) => ({ ...statement, points: Number(statement.points) })) };
  if (form.type === "MATCHING") content = { pairs: form.pairs };
  if (form.type === "ORDERING") content = { items: form.orderingItems };
  if (form.type === "FILL_BLANKS") content = { sentences: form.sentences.map((sentence) => ({ ...sentence, points: Number(sentence.points) })) };
  if (form.type === "INTERACTIVE_CONTENT") content = { layout: form.interactiveLayout, items: form.interactiveItems };
  if (form.type === "INCORRECT_SECTION") content = { sections: form.sections };
  if (form.type === "ASSIGNMENT") content = { fields: form.fields };
  return {
    ...(topicId ? { topicId } : {}),
    title: form.title,
    instructions: form.instructions || null,
    type: form.type,
    content,
    points: Number(form.points),
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

export function ActivityComposer({ topicId, type, activity, onSaved, onCancel, onError }) {
  const [form, setForm] = useState(() => activity ? formFromActivity(activity) : emptyForm(type));
  const [saving, setSaving] = useState(false);
  const definition = contentType(form.type);
  const Icon = definition.icon;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const path = activity ? `/activities/${activity.id}` : "/activities";
      const payload = activityPayload(form, activity ? null : topicId);
      await api(path, { method: activity ? "PATCH" : "POST", body: JSON.stringify(payload) });
      onSaved();
    } catch (error) {
      onError(requestMessage(error));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-xl border-2 border-primary/40 bg-surface shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-inverse"><Icon size={19} /></span>
          <div><p className="text-xs font-bold uppercase tracking-wider text-primary">{activity ? "Editar actividad" : "Nueva actividad"}</p><h4 className="font-bold">{definition.label}</h4></div>
        </div>
        <button type="button" onClick={onCancel} className="rounded-full p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary" aria-label="Cerrar editor de actividad"><X size={19} /></button>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,.92fr)]">
        <div className="space-y-5 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título de la actividad" value={form.title} onChange={(title) => setForm({ ...form, title })} placeholder={`Sin título ${definition.label.toLowerCase()}`} />
            <label><span className="mb-2 block text-sm font-semibold">Tipo de contenido</span><span className="flex min-h-[46px] items-center gap-2 rounded-md border border-border bg-surface-muted px-4 text-sm font-semibold"><Icon size={16} className="text-primary" />{definition.label}</span></label>
          </div>
          <TextArea label="Instrucciones para participantes" value={form.instructions} onChange={(instructions) => setForm({ ...form, instructions })} placeholder="Indicaciones opcionales que se muestran antes de la actividad" />
          <div className="border-t border-border pt-5">
            <ContentFields form={form} setForm={setForm} />
          </div>
          {isScored(form.type) && (
            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
              <Field label="Puntos de la actividad" type="number" min="0" value={form.points} onChange={(points) => setForm({ ...form, points: Number(points) })} />
              <Field label="Intentos máximos" type="number" min="1" value={form.maxAttempts} onChange={(maxAttempts) => setForm({ ...form, maxAttempts: Number(maxAttempts) })} />
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? "Guardando..." : activity ? "Guardar cambios" : "Agregar a la lección"}</button>
          </div>
        </div>
        <div className="border-t border-border bg-background p-5 xl:border-l xl:border-t-0 md:p-6">
          <div className="xl:sticky xl:top-4">
            <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Vista previa en vivo</p><p className="mt-1 text-xs text-text-secondary">Así lo verán los participantes.</p></div><span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold text-text-secondary">VISTA PREVIA</span></div>
            <ActivityPreview form={form} />
          </div>
        </div>
      </div>
    </form>
  );
}

function isScored(type) {
  return ["QUESTIONS", "INCORRECT_SECTION", "ASSIGNMENT", "FINAL_EXAM", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"].includes(type);
}

function ContentFields({ form, setForm }) {
  if (form.type === "READING") return <div className="space-y-4"><TextArea label="Contenido de texto" value={form.readingBody} onChange={(readingBody) => setForm({ ...form, readingBody })} placeholder="Comienza a escribir tu lección..." minHeight="min-h-56" required /><Field label="Tiempo mínimo de lectura (segundos)" type="number" min="0" value={form.minimumReadSeconds} onChange={(minimumReadSeconds) => setForm({ ...form, minimumReadSeconds: Number(minimumReadSeconds) })} /></div>;
  if (form.type === "YOUTUBE_VIDEO") return <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="URL del video de YouTube" type="url" value={form.videoUrl} onChange={(videoUrl) => setForm({ ...form, videoUrl })} placeholder="https://youtube.com/watch?v=..." /></div><Field label="Duración del video (segundos)" type="number" min="1" value={form.videoDurationSeconds} onChange={(videoDurationSeconds) => setForm({ ...form, videoDurationSeconds: Number(videoDurationSeconds) })} /><Field label="Porcentaje mínimo de reproducción" type="number" min="1" max="100" value={form.minimumWatchPercent} onChange={(minimumWatchPercent) => setForm({ ...form, minimumWatchPercent: Number(minimumWatchPercent) })} /></div>;
  if (form.type === "EXTERNAL_LINK") return <div className="space-y-4"><Field label="URL del recurso" type="url" value={form.externalUrl} onChange={(externalUrl) => setForm({ ...form, externalUrl })} placeholder="https://example.org/resource" /><Field label="Texto del botón" value={form.externalLabel} onChange={(externalLabel) => setForm({ ...form, externalLabel })} /><TextArea label="Descripción del recurso" value={form.externalDescription} onChange={(externalDescription) => setForm({ ...form, externalDescription })} placeholder="Explica por qué es importante este recurso" /></div>;
  if (form.type === "EMBEDDED_CONTENT") return <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="URL del contenido incrustado" type="url" value={form.embedUrl} onChange={(embedUrl) => setForm({ ...form, embedUrl })} placeholder="https://..." /></div><Field label="Título del contenido incrustado" value={form.embedTitle} onChange={(embedTitle) => setForm({ ...form, embedTitle })} /><Field label="Altura del marco (píxeles)" type="number" min="240" max="1200" value={form.embedHeight} onChange={(embedHeight) => setForm({ ...form, embedHeight: Number(embedHeight) })} /></div>;
  if (form.type === "CASE_STUDY") return <div className="space-y-5"><TextArea label="Escenario y contexto" value={form.scenario} onChange={(scenario) => setForm({ ...form, scenario })} placeholder="Describe la situación que analizarán los participantes..." minHeight="min-h-40" required /><QuestionBuilder questions={form.questions} onChange={(questions) => setForm({ ...form, questions })} /></div>;
  if (["QUESTIONS", "FINAL_EXAM"].includes(form.type)) return <QuestionBuilder questions={form.questions} onChange={(questions) => setForm({ ...form, questions })} />;
  if (form.type === "TRUE_FALSE") return <TrueFalseBuilder statements={form.statements} onChange={(statements) => setForm({ ...form, statements })} />;
  if (form.type === "MATCHING") return <MatchingBuilder pairs={form.pairs} onChange={(pairs) => setForm({ ...form, pairs })} />;
  if (form.type === "ORDERING") return <SimpleListBuilder title="Secuencia correcta" items={form.orderingItems} onChange={(orderingItems) => setForm({ ...form, orderingItems })} />;
  if (form.type === "FILL_BLANKS") return <FillBlankBuilder sentences={form.sentences} onChange={(sentences) => setForm({ ...form, sentences })} />;
  if (form.type === "INTERACTIVE_CONTENT") return <InteractiveBuilder layout={form.interactiveLayout} items={form.interactiveItems} onLayoutChange={(interactiveLayout) => setForm({ ...form, interactiveLayout })} onChange={(interactiveItems) => setForm({ ...form, interactiveItems })} />;
  if (form.type === "INCORRECT_SECTION") return <SectionBuilder sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />;
  if (form.type === "ASSIGNMENT") return <FieldBuilder fields={form.fields} onChange={(fields) => setForm({ ...form, fields })} />;
  return null;
}

function ActivityPreview({ form }) {
  const definition = contentType(form.type);
  const Icon = definition.icon;
  const title = form.title.trim() || `Sin título ${definition.label.toLowerCase()}`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={17} /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{definition.label}</p><h5 className="font-bold">{title}</h5></div></div>
        {form.instructions.trim() && <p className="mt-4 text-sm leading-6 text-text-secondary">{form.instructions}</p>}
      </div>
      <div className="p-5"><PreviewBody form={form} /></div>
    </div>
  );
}

function PreviewBody({ form }) {
  if (form.type === "READING") return form.readingBody.trim() ? <div className="whitespace-pre-wrap text-sm leading-7">{form.readingBody}</div> : <PreviewEmpty message="Tu texto aparecerá aquí mientras escribes." />;
  if (form.type === "YOUTUBE_VIDEO") return <div className="grid aspect-video place-items-center rounded-lg bg-overlay text-center text-inverse"><div><Video className="mx-auto mb-2" /><p className="text-sm font-semibold">{form.videoUrl ? "Vista previa del video" : "Pega la URL de un video de YouTube"}</p><p className="mt-1 text-xs text-inverse/70">Los participantes deben ver {form.minimumWatchPercent || 0}%</p></div></div>;
  if (form.type === "EXTERNAL_LINK") return <div className="rounded-lg border border-border bg-surface-muted p-4"><p className="text-sm text-text-secondary">{form.externalDescription || "Agrega una descripción breve del recurso."}</p><span className="btn-secondary mt-4 w-full"><ExternalLink size={15} />{form.externalLabel || "Abrir recurso"}</span></div>;
  if (form.type === "EMBEDDED_CONTENT") return <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-border bg-surface-muted text-center"><div><PanelsTopLeft className="mx-auto text-primary" /><p className="mt-2 text-sm font-semibold">{form.embedTitle || "Contenido incrustado"}</p><p className="mt-1 text-xs text-text-secondary">{form.embedUrl || "Agrega la URL del contenido incrustado"}</p></div></div>;
  if (form.type === "INTERACTIVE_CONTENT") return <div className={form.interactiveLayout === "CARDS" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>{form.interactiveItems.map((item, index) => <div key={index} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{item.title || `Elemento ${index + 1}`}</p><p className="mt-1 text-xs leading-5 text-text-secondary">{item.body || "El contenido aparecerá aquí."}</p></div>)}</div>;
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(form.type)) return <div className="space-y-4">{form.type === "CASE_STUDY" && <div className="rounded-lg bg-primary/5 p-4 text-sm leading-6">{form.scenario || "El escenario del caso aparecerá aquí."}</div>}{form.questions.map((question, index) => <div key={index}><p className="text-sm font-semibold">{index + 1}. {question.prompt || "Pregunta sin título"}</p><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><span className="size-3 rounded-full border border-border" />{option || `Opción ${optionIndex + 1}`}</div>)}</div></div>)}</div>;
  if (form.type === "TRUE_FALSE") return <div className="space-y-3">{form.statements.map((statement, index) => <div key={index} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{statement.prompt || `Afirmación ${index + 1}`}</p><div className="mt-2 grid grid-cols-2 gap-2"><span className="rounded-md bg-surface-muted px-3 py-2 text-center text-xs">Verdadero</span><span className="rounded-md bg-surface-muted px-3 py-2 text-center text-xs">Falso</span></div></div>)}</div>;
  if (form.type === "MATCHING") return <div className="space-y-2">{form.pairs.map((pair, index) => <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"><span className="rounded-md border border-border p-2">{pair.left || "Concepto"}</span><span>→</span><span className="rounded-md border border-border p-2">{pair.right || "Correspondencia"}</span></div>)}</div>;
  if (form.type === "ORDERING") return <div className="space-y-2">{form.orderingItems.map((item, index) => <div key={index} className="flex items-center gap-2 rounded-md border border-border p-3 text-xs"><GripVertical size={14} className="text-text-secondary" /><strong>{index + 1}</strong>{item || "Elemento de la secuencia"}</div>)}</div>;
  if (form.type === "FILL_BLANKS") return <div className="space-y-3">{form.sentences.map((sentence, index) => <div key={index}><p className="text-sm">{sentence.prompt || "Una frase con un espacio ____ para completar."}</p><div className="mt-2 h-9 rounded-md border border-border bg-surface-muted" /></div>)}</div>;
  if (form.type === "INCORRECT_SECTION") return <div className="space-y-2">{form.sections.map((section, index) => <div key={index} className="rounded-md border border-border p-3 text-xs">{section.text || `Sección seleccionable ${index + 1}`}</div>)}</div>;
  if (form.type === "ASSIGNMENT") return <div className="space-y-3">{form.fields.map((field, index) => <label key={index} className="block"><span className="mb-1 block text-xs font-semibold">{field.label || `Campo de respuesta ${index + 1}`}</span><span className={`block rounded-md border border-border bg-surface-muted ${field.type === "textarea" ? "h-20" : "h-9"}`} /></label>)}</div>;
  return <PreviewEmpty message="Comienza a editar para ver una vista previa." />;
}

function PreviewEmpty({ message }) {
  return <div className="rounded-lg border border-dashed border-border bg-surface-muted p-8 text-center text-xs text-text-secondary">{message}</div>;
}

function QuestionBuilder({ questions, onChange }) {
  function update(index, patch) { onChange(questions.map((question, position) => position === index ? { ...question, ...patch } : question)); }
  return <BuilderList label="Preguntas" onAdd={() => onChange([...questions, { prompt: "", options: ["", ""], correctIndex: 0, points: 1 }])} addLabel="Agregar pregunta">{questions.map((question, index) => <BuilderCard key={index} title={`Pregunta ${index + 1}`} onRemove={questions.length > 1 ? () => onChange(questions.filter((_, position) => position !== index)) : null}><Field label="Enunciado" value={question.prompt} onChange={(prompt) => update(index, { prompt })} placeholder="Escribe la pregunta" /><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="grid grid-cols-[auto_1fr_auto] items-center gap-2"><button type="button" onClick={() => update(index, { correctIndex: optionIndex })} className={`grid size-11 shrink-0 place-items-center rounded-full border ${question.correctIndex === optionIndex ? "border-success bg-success text-inverse" : "border-border text-text-secondary"}`} aria-label={`Marcar la opción ${optionIndex + 1} como correcta`}>{question.correctIndex === optionIndex ? <Check size={15} /> : optionIndex + 1}</button><input className="input-field" value={option} onChange={(event) => update(index, { options: question.options.map((item, position) => position === optionIndex ? event.target.value : item) })} placeholder={`Opción ${optionIndex + 1}`} required />{question.options.length > 2 && <button type="button" onClick={() => update(index, { options: question.options.filter((_, position) => position !== optionIndex), correctIndex: 0 })} className="p-2 text-text-secondary hover:text-error" aria-label="Eliminar opción"><X size={16} /></button>}</div>)}</div><button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => update(index, { options: [...question.options, ""] })}>+ Agregar opción</button><div className="mt-4 max-w-40"><Field label="Puntos" type="number" min="1" value={question.points} onChange={(points) => update(index, { points: Number(points) })} /></div></BuilderCard>)}</BuilderList>;
}

function TrueFalseBuilder({ statements, onChange }) {
  const update = (index, patch) => onChange(statements.map((statement, position) => position === index ? { ...statement, ...patch } : statement));
  return <BuilderList label="Afirmaciones" onAdd={() => onChange([...statements, { prompt: "", correctAnswer: true, points: 1 }])} addLabel="Agregar afirmación">{statements.map((statement, index) => <BuilderCard key={index} title={`Afirmación ${index + 1}`} onRemove={statements.length > 1 ? () => onChange(statements.filter((_, position) => position !== index)) : null}><Field label="Afirmación" value={statement.prompt} onChange={(prompt) => update(index, { prompt })} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label="Respuesta correcta" value={statement.correctAnswer ? "TRUE" : "FALSE"} options={[{ value: "TRUE", label: "Verdadero" }, { value: "FALSE", label: "Falso" }]} onChange={(value) => update(index, { correctAnswer: value === "TRUE" })} /><Field label="Puntos" type="number" min="1" value={statement.points} onChange={(points) => update(index, { points: Number(points) })} /></div></BuilderCard>)}</BuilderList>;
}

function MatchingBuilder({ pairs, onChange }) {
  const update = (index, field, value) => onChange(pairs.map((pair, position) => position === index ? { ...pair, [field]: value } : pair));
  return <BuilderList label="Pares para relacionar" onAdd={() => onChange([...pairs, { left: "", right: "" }])} addLabel="Agregar par">{pairs.map((pair, index) => <BuilderCard key={index} title={`Par ${index + 1}`} onRemove={pairs.length > 2 ? () => onChange(pairs.filter((_, position) => position !== index)) : null}><div className="grid gap-4 md:grid-cols-2"><Field label="Concepto" value={pair.left} onChange={(value) => update(index, "left", value)} /><Field label="Correspondencia correcta" value={pair.right} onChange={(value) => update(index, "right", value)} /></div></BuilderCard>)}</BuilderList>;
}

function SimpleListBuilder({ title, items, onChange }) {
  return <BuilderList label={title} onAdd={() => onChange([...items, ""])} addLabel="Agregar elemento">{items.map((item, index) => <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><input className="input-field" value={item} onChange={(event) => onChange(items.map((entry, position) => position === index ? event.target.value : entry))} placeholder={`Paso ${index + 1}`} required />{items.length > 2 && <button type="button" onClick={() => onChange(items.filter((_, position) => position !== index))} className="p-2 text-text-secondary hover:text-error"><X size={16} /></button>}</div>)}</BuilderList>;
}

function FillBlankBuilder({ sentences, onChange }) {
  const update = (index, patch) => onChange(sentences.map((sentence, position) => position === index ? { ...sentence, ...patch } : sentence));
  return <BuilderList label="Enunciados para completar" onAdd={() => onChange([...sentences, { prompt: "", answer: "", caseSensitive: false, points: 1 }])} addLabel="Agregar enunciado">{sentences.map((sentence, index) => <BuilderCard key={index} title={`Enunciado ${index + 1}`} onRemove={sentences.length > 1 ? () => onChange(sentences.filter((_, position) => position !== index)) : null}><div className="grid gap-4 md:grid-cols-2"><Field label="Frase (usa ____ para indicar el espacio en blanco)" value={sentence.prompt} onChange={(prompt) => update(index, { prompt })} /><Field label="Respuesta esperada" value={sentence.answer} onChange={(answer) => update(index, { answer })} /><Field label="Puntos" type="number" min="1" value={sentence.points} onChange={(points) => update(index, { points: Number(points) })} /><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={sentence.caseSensitive} onChange={(event) => update(index, { caseSensitive: event.target.checked })} className="accent-primary" /> Distinguir mayúsculas y minúsculas</label></div></BuilderCard>)}</BuilderList>;
}

function InteractiveBuilder({ layout, items, onLayoutChange, onChange }) {
  const update = (index, patch) => onChange(items.map((item, position) => position === index ? { ...item, ...patch } : item));
  return <div className="space-y-5"><Select label="Estilo de presentación" value={layout} options={[{ value: "ACCORDION", label: "Acordeón" }, { value: "TABS", label: "Pestañas" }, { value: "CARDS", label: "Tarjetas" }]} onChange={onLayoutChange} /><BuilderList label="Elementos interactivos" onAdd={() => onChange([...items, { title: "", body: "" }])} addLabel="Agregar elemento">{items.map((item, index) => <BuilderCard key={index} title={`Elemento ${index + 1}`} onRemove={items.length > 2 ? () => onChange(items.filter((_, position) => position !== index)) : null}><Field label="Título" value={item.title} onChange={(title) => update(index, { title })} /><div className="mt-4"><TextArea label="Contenido" value={item.body} onChange={(body) => update(index, { body })} required /></div></BuilderCard>)}</BuilderList></div>;
}

function SectionBuilder({ sections, onChange }) {
  const update = (index, patch) => onChange(sections.map((section, position) => position === index ? { ...section, ...patch } : section));
  return <BuilderList label="Secciones seleccionables" onAdd={() => onChange([...sections, { text: "", incorrect: false }])} addLabel="Agregar sección">{sections.map((section, index) => <div key={index} className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><input className="input-field" value={section.text} onChange={(event) => update(index, { text: event.target.value })} placeholder={`Sección ${index + 1}`} required /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={section.incorrect} onChange={(event) => update(index, { incorrect: event.target.checked })} className="accent-primary" /> Incorrecto</label>{sections.length > 2 && <button type="button" onClick={() => onChange(sections.filter((_, position) => position !== index))} className="p-2 text-text-secondary hover:text-error"><X size={16} /></button>}</div>)}</BuilderList>;
}

function FieldBuilder({ fields, onChange }) {
  const update = (index, patch) => onChange(fields.map((field, position) => position === index ? { ...field, ...patch } : field));
  return <BuilderList label="Campos de respuesta" onAdd={() => onChange([...fields, { label: "", type: "textarea", required: true }])} addLabel="Agregar campo">{fields.map((field, index) => <BuilderCard key={index} title={`Campo ${index + 1}`} onRemove={fields.length > 1 ? () => onChange(fields.filter((_, position) => position !== index)) : null}><div className="grid gap-4 sm:grid-cols-2"><Field label="Etiqueta del campo" value={field.label} onChange={(label) => update(index, { label })} /><Select label="Tipo de respuesta" value={field.type} options={[{ value: "text", label: "Texto corto" }, { value: "textarea", label: "Texto largo" }, { value: "number", label: "Número" }]} onChange={(type) => update(index, { type })} /></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} className="accent-primary" /> Respuesta obligatoria</label></BuilderCard>)}</BuilderList>;
}

function BuilderList({ label, onAdd, addLabel, children }) {
  return <div className="space-y-3"><p className="text-sm font-bold">{label}</p>{children}<button type="button" className="btn-secondary w-full border-dashed" onClick={onAdd}><Plus size={15} />{addLabel}</button></div>;
}

function BuilderCard({ title, onRemove, children }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-4"><div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</p>{onRemove && <button type="button" onClick={onRemove} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-error" aria-label={`Eliminar ${title}`}><Trash2 size={15} /></button>}</div>{children}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder = "", min, max, required = true }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} min={min} max={max} required={required} /></label>;
}

function TextArea({ label, value, onChange, placeholder = "", minHeight = "min-h-28", required = false }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><textarea className={`input-field resize-y ${minHeight}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></label>;
}

function Select({ label, value, options, onChange }) {
  const normalized = useMemo(() => options.map((option) => typeof option === "string" ? { value: option, label: option } : option), [options]);
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><span className="relative block"><select className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)}>{normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>;
}
