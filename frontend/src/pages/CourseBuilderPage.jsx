import Pagination from "../components/Pagination.jsx";
import useUnsavedChanges from "../hooks/useUnsavedChanges.js";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ACTIVITY_ICONS, CONTENT_TYPES } from "../components/course-builder/activityTypes.js";
import ActivityComposer from "../components/course-builder/StudentActivityEditor.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api, assetUrl } from "../lib/api.js";
import { certificateCanvasStyle, certificateNameStyle } from "../lib/certificate-preview.js";
import { roleLabel } from "../lib/labels.js";

function metadataFromCourse(course) {
  return {
    title: course.title,
    description: course.description,
    category: course.category,
    difficulty: course.difficulty,
    durationMinutes: course.durationMinutes,
    passingGrade: course.passingGrade,
    status: course.status,
    certificateEnabled: Boolean(course.certificateTemplateId),
    certificateTemplateId: course.certificateTemplateId ?? "",
    accessType: course.accessType,
    accessRoleId: course.accessRoleId ?? "",
    accessOrganizationId: course.accessOrganizationId ?? "",
    accessUserIds: course.accessUsers.map((entry) => entry.user.id)
  };
}

function errorMessage(error) {
  const fieldErrors = error.details?.fieldErrors;
  const detail = fieldErrors ? Object.values(fieldErrors).flat().join(" ") : "";
  return detail ? `${error.message}: ${detail}` : error.message;
}

export default function CourseBuilderPage() {
  const { user } = useAuth();
  const canViewTemplates = can(user, "certificate_templates.view");
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [audiencePage, setAudiencePage] = useState(1);
  const [audienceOptions, setAudienceOptions] = useState({ roles: [], organizations: [], users: [] });
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [newBlock, setNewBlock] = useState("");
  const [lessonBlock, setLessonBlock] = useState(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [composer, setComposer] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(null);
  const dirty = baseline !== null && JSON.stringify(metadata) !== baseline;
  useUnsavedChanges(dirty);

  const loadCourse = useCallback(async () => {
    const result = await api(`/courses/${id}?outline=true`);
    setCourse(result.data);
    setMetadata((current) => current ?? metadataFromCourse(result.data));
    setBaseline(current => current ?? JSON.stringify(metadataFromCourse(result.data)));
    return result.data;
  }, [id]);

  useEffect(() => { loadCourse().catch(failure => setError(errorMessage(failure))); }, [loadCourse]);
  useEffect(() => {
    if (!showSettings) return;
    const timer = setTimeout(() => Promise.all([can(user, "courses.edit") ? api(`/courses/audience-options?page=${audiencePage}&limit=20&search=${encodeURIComponent(audienceSearch)}`) : Promise.resolve({ data: { roles: [], organizations: [], users: [] } }), canViewTemplates ? api("/certificates/templates") : Promise.resolve({ data: [] })])
      .then(([options, templates]) => { setAudienceOptions(options.data); setCertificateTemplates(templates.data); })
      .catch(failure => setError(errorMessage(failure))), 200);
    return () => clearTimeout(timer);
  }, [showSettings, canViewTemplates, user, audienceSearch, audiencePage]);

  function notify(message) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 2600);
  }

  async function saveMetadata(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...metadata,
        certificateEnabled: Boolean(metadata.certificateTemplateId),
        certificateTemplateId: metadata.certificateTemplateId || null,
        accessRoleId: metadata.accessType === "ROLE" ? metadata.accessRoleId : null,
        accessOrganizationId: metadata.accessType === "ORGANIZATION" ? metadata.accessOrganizationId : null,
        accessUserIds: metadata.accessType === "USERS" ? metadata.accessUserIds : []
      };
      const result = await api(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setCourse((current) => ({ ...current, ...result.data, blocks: current.blocks }));
      setBaseline(JSON.stringify(metadata));
      notify("Configuración del curso guardada");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function addBlock(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/blocks", { method: "POST", body: JSON.stringify({ courseId: id, title: newBlock }) });
      setNewBlock("");
      setShowBlockForm(false);
      await loadCourse();
      notify("Bloque agregado");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function addLesson(event, blockId) {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/topics", { method: "POST", body: JSON.stringify({ blockId, title: lessonTitle }) });
      setLessonTitle("");
      setLessonBlock(null);
      await loadCourse();
      notify("Lección agregada");
      setComposer({ topicId: result.data.id, type: "COMPOSITE", activity: null });
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function rename(path, title, label) {
    setError("");
    try {
      await api(path, { method: "PATCH", body: JSON.stringify({ title }) });
      await loadCourse();
      notify(`${label} renombrada`);
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    }
  }

  async function remove(path, label) {
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    setError("");
    try {
      await api(path, { method: "DELETE" });
      if (composer?.activity && path.endsWith(composer.activity.id)) setComposer(null);
      await loadCourse();
      notify(`${label} eliminada`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function finishActivity(message) {
    setComposer(null);
    await loadCourse();
    notify(message);
  }

  if (!course || !metadata) {
    return <div className="container-page py-16 text-center text-text-secondary">{error || "Cargando constructor del curso..."}</div>;
  }

  const lessonCount = course.blocks.reduce((total, block) => total + block.topics.length, 0);
  const activityCount = course.blocks.reduce((total, block) => total + block.topics.reduce((count, topic) => count + topic.activities.length, 0), 0);

  return (
    <div className="container-page pb-12 pt-5">
      <header className="rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/instructor" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Volver a cursos</Link><StatusBadge value={metadata.status} /></div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{metadata.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-secondary">{course.blocks.length} bloques · {lessonCount} lecciones · {activityCount} actividades{dirty && <span className="ml-3 text-warning">Cambios sin guardar</span>}</p><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={() => setShowSettings(value => !value)}><Settings2 size={16} />Configuración del curso<ChevronDown size={15} /></button>{showSettings && <button type="button" className="btn-primary" disabled={saving || !can(user, "courses.edit") || !dirty} onClick={() => document.getElementById("course-settings")?.requestSubmit()}><Save size={16} />{saving ? "Guardando..." : "Guardar"}</button>}</div></div>
      </header>

      {error && <div className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-error bg-error/10 p-4 text-sm text-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar error">×</button></div>}
      {success && <div className="fixed left-4 right-4 top-4 z-[60] flex sm:left-auto sm:max-w-sm items-center gap-3 rounded-lg border border-success bg-surface px-4 py-3 text-sm font-semibold text-success shadow-panel" role="status" aria-live="polite"><CheckCircle2 size={20} />{success}</div>}

      <div className={`grid transition-all ${showSettings ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!showSettings}>
        <div className="overflow-hidden">
          <fieldset className="min-w-0" disabled={!can(user, "courses.edit")}><CourseSettingsForm audienceSearch={audienceSearch} onAudienceSearch={value => { setAudienceSearch(value); setAudiencePage(1); }} onAudiencePage={setAudiencePage} canPublish={can(user, "courses.publish")} metadata={metadata} setMetadata={setMetadata} audienceOptions={audienceOptions} certificateTemplates={certificateTemplates} onSubmit={saveMetadata} /></fieldset>
        </div>
      </div>

      <fieldset className="min-w-0" disabled={!can(user, "courses.content")}><section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Estructura del curso</p><h2 className="mt-2 text-2xl font-bold">Bloques, lecciones y contenido</h2><p className="mt-1 text-sm text-text-secondary">Este orden define la ruta que seguirán los participantes.</p></div>
          <button type="button" className="btn-primary" onClick={() => setShowBlockForm(true)}><Plus size={17} />Agregar bloque</button>
        </div>

        {!course.blocks.length && !showBlockForm ? (
          <div className="mt-6"><EmptyState title="Comienza con un bloque" description="Los bloques organizan las secciones principales del curso. Crea uno y después agrega lecciones y contenido." action={<button type="button" className="btn-primary" onClick={() => setShowBlockForm(true)}><Plus size={16} />Crear primer bloque</button>} /></div>
        ) : (
          <div className="mt-6 space-y-6">
            {course.blocks.map((block, blockIndex) => (
              <BlockCard
                key={block.id}
                block={block}
                blockIndex={blockIndex}
                lessonBlock={lessonBlock}
                lessonTitle={lessonTitle}
                setLessonTitle={setLessonTitle}
                composer={composer}
                onStartLesson={() => { setLessonBlock(block.id); setLessonTitle(""); }}
                onCancelLesson={() => { setLessonBlock(null); setLessonTitle(""); }}
                onAddLesson={(event) => addLesson(event, block.id)}
                onAddActivity={(topicId) => setComposer({ topicId, type: "COMPOSITE", activity: null })}
                onEditActivity={async (topicId, activity) => { try { const result = await api(`/activities/${activity.id}`); setComposer({ topicId, type: activity.type, activity: result.data }); } catch (failure) { setError(errorMessage(failure)); } }}
                onCancelComposer={() => setComposer(null)}
                onActivitySaved={(activity) => finishActivity(activity ? "Actividad actualizada" : "Actividad agregada")}
                onError={setError}
                onRenameBlock={(title) => rename(`/blocks/${block.id}`, title, "Bloque")}
                onRenameLesson={(topicId, title) => rename(`/topics/${topicId}`, title, "Lección")}
                onRemoveBlock={() => remove(`/blocks/${block.id}`, `el bloque “${block.title}”`)}
                onRemoveLesson={(topic) => remove(`/topics/${topic.id}`, `la lección “${topic.title}”`)}
                onRemoveActivity={(activity) => remove(`/activities/${activity.id}`, `la actividad “${activity.title}”`)}
              />
            ))}
            <AddBlockCard open={showBlockForm} value={newBlock} onChange={setNewBlock} onOpen={() => setShowBlockForm(true)} onCancel={() => { setShowBlockForm(false); setNewBlock(""); }} onSubmit={addBlock} />
          </div>
        )}
      </section></fieldset>
    </div>
  );
}

function BlockCard({
  block,
  blockIndex,
  lessonBlock,
  lessonTitle,
  setLessonTitle,
  composer,
  onStartLesson,
  onCancelLesson,
  onAddLesson,
  onAddActivity,
  onEditActivity,
  onCancelComposer,
  onActivitySaved,
  onError,
  onRenameBlock,
  onRenameLesson,
  onRemoveBlock,
  onRemoveLesson,
  onRemoveActivity
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-primary px-5 py-4 text-inverse md:px-6">
        <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-inverse/70">Bloque {blockIndex + 1}</p><EditableTitle value={block.title} onSave={onRenameBlock} inverse /></div>
        <button type="button" className="rounded-md p-2 text-inverse" aria-expanded={!collapsed} aria-label={`${collapsed ? "Expandir" : "Contraer"} ${block.title}`} onClick={() => setCollapsed(value => !value)}><ChevronDown size={20} className={collapsed ? "-rotate-90" : ""} /></button>
        <button type="button" onClick={onRemoveBlock} className="rounded-lg p-2 text-inverse/75 transition hover:bg-inverse/10 hover:text-inverse" aria-label={`Eliminar ${block.title}`}><Trash2 size={18} /></button>
      </div>

      <div hidden={collapsed} className="space-y-5 p-4 md:p-6">
        {block.topics.map((topic, topicIndex) => (
          <section key={topic.id} className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-4 md:px-5">
              <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-text-secondary">Lección {topicIndex + 1}</p><EditableTitle value={topic.title} onSave={(title) => onRenameLesson(topic.id, title)} /></div>
              <button type="button" onClick={() => onRemoveLesson(topic)} className="rounded-lg border border-border p-2 text-text-secondary transition hover:border-error hover:text-error" aria-label={`Eliminar ${topic.title}`}><Trash2 size={16} /></button>
            </div>

            <div className="space-y-3 p-3 md:p-4">
              {topic.activities.map((activity, activityIndex) => (
                <div key={activity.id}>
                  {composer?.activity?.id === activity.id ? (
                    <div id="active-content-editor">
                      <ActivityComposer key={activity.id} topicId={topic.id} type={activity.type} activity={activity} onSaved={() => onActivitySaved(activity)} onCancel={onCancelComposer} onError={onError} />
                    </div>
                  ) : (
                    <ActivityRow activity={activity} index={activityIndex} onEdit={() => onEditActivity(topic.id, activity)} onRemove={() => onRemoveActivity(activity)} />
                  )}
                </div>
              ))}

              {composer && !composer.activity && composer.topicId === topic.id && (
                <div id="active-content-editor">
                  <ActivityComposer key={`${topic.id}-${composer.type}`} topicId={topic.id} type={composer.type} initialModuleType={composer.initialModuleType} activity={null} onSaved={() => onActivitySaved(null)} onCancel={onCancelComposer} onError={onError} />
                </div>
              )}

              {!topic.activities.length && !(composer && !composer.activity && composer.topicId === topic.id) && (
                <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center"><FileText className="mx-auto text-text-secondary" size={22} /><p className="mt-2 text-sm font-semibold">Esta lección está vacía</p><p className="mt-1 text-xs text-text-secondary">Crea una actividad y combina texto, video, preguntas y otros bloques de contenido.</p></div>
              )}

              <button type="button" onClick={() => onAddActivity(topic.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/35 bg-surface px-4 py-3.5 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"><Plus size={17} />Agregar actividad</button>
            </div>
          </section>
        ))}

        {lessonBlock === block.id ? (
          <form onSubmit={onAddLesson} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <label><span className="mb-2 block text-sm font-semibold">Título de la lección</span><input className="input-field" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Ej. Comprender los conflictos de interés" autoFocus required /></label>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={onCancelLesson}>Cancelar</button><button type="submit" className="btn-primary"><Plus size={16} />Agregar lección</button></div>
          </form>
        ) : (
          <button type="button" onClick={onStartLesson} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-4 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"><Plus size={17} />Agregar lección a este bloque</button>
        )}
      </div>
    </article>
  );
}

function ActivityRow({ activity, index, onEdit, onRemove }) {
  const Icon = ACTIVITY_ICONS[activity.type] ?? FileText;
  const definition = CONTENT_TYPES.find((item) => item.type === activity.type);
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50 hover:shadow-panel">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={18} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{index + 1}. {activity.title}</span><span className="mt-1 block text-xs text-text-secondary">{definition?.label ?? "Actividad"}{activity.points > 0 ? ` · ${activity.points} puntos` : ""}</span></span>
        <span className="hidden items-center gap-1 text-xs font-semibold text-primary sm:flex">Editar <ChevronRight size={15} /></span>
      </button>
      <button type="button" onClick={onRemove} className="rounded-lg p-2 text-text-secondary opacity-70 transition hover:bg-error/10 hover:text-error group-hover:opacity-100" aria-label={`Eliminar ${activity.title}`}><Trash2 size={16} /></button>
    </div>
  );
}

function EditableTitle({ value, onSave, inverse = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(value), [value]);

  async function submit(event) {
    event.preventDefault();
    const next = draft.trim();
    if (next.length < 2 || next === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <form onSubmit={submit} className="mt-1 flex max-w-2xl flex-wrap gap-2"><input className={`min-w-0 flex-[1_1_10rem] rounded-md border px-3 py-2 text-sm font-bold ${inverse ? "border-inverse/40 bg-inverse/10 text-inverse placeholder:text-inverse/60" : "border-border bg-surface text-text-primary"}`} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus minLength={2} required /><button type="submit" disabled={busy} className={`rounded-md px-3 text-xs font-bold ${inverse ? "bg-inverse text-primary" : "bg-primary text-inverse"}`}>{busy ? "..." : "Guardar"}</button><button type="button" onClick={() => { setDraft(value); setEditing(false); }} className={`rounded-md px-2 ${inverse ? "text-inverse/80 hover:bg-inverse/10" : "text-text-secondary hover:bg-surface-muted"}`}>×</button></form>;
  }

  return <button type="button" onClick={() => setEditing(true)} className={`group/title mt-1 flex max-w-full items-center gap-2 text-left font-bold ${inverse ? "text-xl text-inverse" : "text-base text-text-primary"}`} title="Renombrar"><span className="truncate">{value}</span><Pencil size={14} className="shrink-0 opacity-0 transition group-hover/title:opacity-70" /></button>;
}

function AddBlockCard({ open, value, onChange, onOpen, onCancel, onSubmit }) {
  if (!open) return <button type="button" onClick={onOpen} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/60 px-5 py-6 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"><Plus size={18} />Agregar otro bloque</button>;
  return <form onSubmit={onSubmit} className="rounded-2xl border-2 border-primary/30 bg-surface p-5 shadow-panel"><p className="eyebrow">Nuevo bloque</p><label className="mt-3 block"><span className="mb-2 block text-sm font-semibold">Título del bloque</span><input className="input-field" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ej. Fundamentos y conceptos clave" autoFocus required /></label><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button><button type="submit" className="btn-primary"><Plus size={16} />Crear bloque</button></div></form>;
}


function CourseSettingsForm({ audienceSearch, onAudienceSearch, onAudiencePage, canPublish, metadata, setMetadata, audienceOptions, certificateTemplates, onSubmit }) {
  const selectedTemplate = certificateTemplates.find((template) => template.id === metadata.certificateTemplateId);
  return (
    <form id="course-settings" onSubmit={onSubmit} className="panel mt-5 grid gap-4 p-5 md:grid-cols-2 md:p-6">
      <div className="md:col-span-2"><p className="eyebrow">Configuración del curso</p><h2 className="mt-1 text-xl font-bold">Detalles, publicación y acceso</h2></div>
      <Field label="Título" value={metadata.title} onChange={(title) => setMetadata({ ...metadata, title })} />
      <Field label="Categoría" value={metadata.category} onChange={(category) => setMetadata({ ...metadata, category })} />
      <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Descripción</span><textarea className="input-field min-h-28" value={metadata.description} onChange={(event) => setMetadata({ ...metadata, description: event.target.value })} /></label>
      <Select label="Dificultad" value={metadata.difficulty} options={["BEGINNER", "INTERMEDIATE", "ADVANCED"]} onChange={(difficulty) => setMetadata({ ...metadata, difficulty })} />
      <Select disabled={!canPublish} label="Estado" value={metadata.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(status) => setMetadata({ ...metadata, status })} />
      <Field label="Duración (minutos)" type="number" value={metadata.durationMinutes} onChange={(durationMinutes) => setMetadata({ ...metadata, durationMinutes: Number(durationMinutes) })} />
      <Field label="Calificación mínima (%)" type="number" value={metadata.passingGrade} onChange={(passingGrade) => setMetadata({ ...metadata, passingGrade: Number(passingGrade) })} />
      <div className="border-t border-border pt-5 md:col-span-2">
        <p className="eyebrow">Certificación</p>
        <h3 className="mt-1 font-bold">Certificado del curso</h3>
        <p className="mt-1 text-sm text-text-secondary">Es opcional. Si eliges una plantilla, se emitirá al completar y aprobar el curso.</p>
      </div>
      <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Plantilla de certificado</span><span className="relative block"><select aria-label="Plantilla de certificado" className="input-field appearance-none" value={metadata.certificateTemplateId} onChange={(event) => setMetadata({ ...metadata, certificateTemplateId: event.target.value, certificateEnabled: Boolean(event.target.value) })}><option value="">Sin certificado</option>{certificateTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>
      {selectedTemplate ? <div className="overflow-hidden rounded-lg border border-border md:col-span-2"><div className="relative bg-white" style={certificateCanvasStyle}><img src={assetUrl(selectedTemplate.backgroundImage)} alt={`Vista previa de ${selectedTemplate.name}`} className="block h-auto w-full" /><span className="absolute flex items-center justify-center text-center font-bold leading-tight" style={certificateNameStyle(selectedTemplate)}>NOMBRE DE LA PERSONA</span></div><div className="flex items-center gap-2 bg-success/10 px-4 py-3 text-sm font-semibold text-success"><Award size={17} />Este curso entregará “{selectedTemplate.name}”.</div></div> : <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-text-secondary md:col-span-2"><Award size={20} />Este curso no entregará certificado.</div>}
      <div className="border-t border-border pt-5 md:col-span-2"><p className="eyebrow">Acceso al curso</p><h3 className="mt-1 font-bold">¿Quién puede encontrar e inscribirse en este curso?</h3></div>
      <Select label="Tipo de acceso" value={metadata.accessType} options={["ROLE", "ORGANIZATION", "USERS"]} onChange={(accessType) => setMetadata({ ...metadata, accessType })} />
      {metadata.accessType === "ROLE" && <OptionSelect label="Rol con acceso" value={metadata.accessRoleId} options={audienceOptions.roles.map((role) => ({ value: role.id, label: role.displayName }))} onChange={(accessRoleId) => setMetadata({ ...metadata, accessRoleId })} />}
      {metadata.accessType === "ORGANIZATION" && <OptionSelect label="Organización con acceso" value={metadata.accessOrganizationId} options={audienceOptions.organizations.map((organization) => ({ value: organization.id, label: organization.name }))} onChange={(accessOrganizationId) => setMetadata({ ...metadata, accessOrganizationId })} />}
      {metadata.accessType === "USERS" && <div className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Personas con acceso</span><input className="input-field mb-3" type="search" aria-label="Buscar personas para la audiencia" placeholder="Buscar por nombre o correo" value={audienceSearch} onChange={event => onAudienceSearch(event.target.value)} /><p className="mb-2 text-xs text-text-secondary">Las personas seleccionadas se conservan al cambiar de página.</p><div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-border bg-surface-muted p-3 md:grid-cols-2">{audienceOptions.users.map((user) => <label key={user.id} className="flex items-start gap-3 rounded-md bg-surface p-3 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={metadata.accessUserIds.includes(user.id)} onChange={(event) => setMetadata({ ...metadata, accessUserIds: event.target.checked ? [...metadata.accessUserIds, user.id] : metadata.accessUserIds.filter((userId) => userId !== user.id) })} /><span><strong className="block">{user.firstName} {user.lastName}</strong><span className="text-xs text-text-secondary">{user.email} · {user.role.displayName ?? roleLabel(user.role.name)}</span></span></label>)}</div>{audienceOptions.meta && <Pagination meta={audienceOptions.meta} onChange={onAudiencePage} />}</div>}
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function Select({ label, value, options, onChange, disabled }) {
  const labels = { BEGINNER: "Principiante", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado", DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado", ROLE: "Por rol", ORGANIZATION: "Por organización", USERS: "Personas específicas" };
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><span className="relative block"><select aria-label={label} disabled={disabled} className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{labels[option] ?? option.replaceAll("_", " ")}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>;
}

function OptionSelect({ label, value, options, onChange }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><span className="relative block"><select aria-label={label} className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)} required><option value="">Selecciona una opción</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>;
}
