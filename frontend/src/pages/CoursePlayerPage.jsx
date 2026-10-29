import TrackedVideo from "../components/TrackedVideo.jsx";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Lock,
  PlayCircle,
  Send
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { CONTENT_TYPES } from "../components/course-builder/activityTypes.js";
import { api } from "../lib/api.js";
import { downloadCertificatePng } from "../lib/certificate-preview.js";

function activityTypeLabel(type) {
  if (type === "CERTIFICATE_CLAIM") return "Certificado";
  if (type === "COMPOSITE") return "Actividad modular";
  return CONTENT_TYPES.find((item) => item.type === type)?.label ?? "Actividad";
}

export default function CoursePlayerPage() {
  const { user } = useAuth();
  const canParticipate = can(user, "learning.participate");
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api(`/progress/courses/${id}`);
      setData(result.data);
      const all = result.data.blocks.flatMap((block) => block.topics.flatMap((topic) => topic.activities));
      setSelectedId((current) => current ?? all.find((activity) => activity.progress?.status !== "LOCKED")?.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const courseActivities = useMemo(
    () => data?.blocks.flatMap((block) => block.topics.flatMap((topic) => topic.activities)) ?? [],
    [data]
  );
  const certificateActivity = useMemo(() => {
    if (!data?.enrollment.course.certificateTemplateId) return null;
    const completionPercent = data.enrollment.courseProgress?.completionPercent ?? 0;
    return {
      id: "certificate-claim",
      type: "CERTIFICATE_CLAIM",
      title: "Reclama tu certificado",
      instructions: "Tu reconocimiento estará disponible al completar y aprobar el curso.",
      progress: { status: data.enrollment.certificate ? "COMPLETED" : completionPercent >= 100 && data.enrollment.courseProgress?.passed ? "AVAILABLE" : "LOCKED" },
      enrollment: data.enrollment
    };
  }, [data]);
  const activities = useMemo(() => certificateActivity ? [...courseActivities, certificateActivity] : courseActivities, [courseActivities, certificateActivity]);
  const selected = activities.find((activity) => activity.id === selectedId);
  const selectedIndex = activities.findIndex((activity) => activity.id === selectedId);
  const nextActivity = selectedIndex >= 0
    ? activities.slice(selectedIndex + 1).find((activity) => activity.progress?.status !== "LOCKED")
    : null;

  useEffect(() => {
    if (canParticipate && selected && selected.type !== "CERTIFICATE_CLAIM" && selected.progress?.status === "AVAILABLE") {
      api(`/progress/activities/${selected.id}/start`, { method: "POST" }).then(load).catch((requestError) => setError(requestError.message));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return <div className="container-page py-16 text-center text-text-secondary">{error || "Cargando curso..."}</div>;
  }

  return (
    <div className="grid min-h-[calc(100dvh-9rem)] min-w-0 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start border-b border-border bg-surface lg:sticky lg:top-0 lg:max-h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-border p-5">
          <Link to="/learning" className="text-xs font-semibold text-primary">← Mis cursos</Link>
          <h1 className="mt-2 font-bold">{data.enrollment.course.title}</h1>
          <div className="mt-4"><ProgressBar value={data.enrollment.courseProgress?.completionPercent ?? 0} label="Progreso del curso" compact /></div>{data.enrollment.courseProgress?.completionPercent >= 100 && <p className={`mt-2 text-xs font-semibold ${data.enrollment.courseProgress.passed ? "text-success" : "text-error"}`}>{data.enrollment.courseProgress.passed ? "Curso aprobado" : `Curso completado. Necesitas al menos ${data.enrollment.course.passingGrade}% para aprobar y obtener el certificado.`}</p>}
          <button type="button" className="btn-secondary mt-4 w-full lg:hidden" aria-expanded={outlineOpen} aria-controls="course-outline" onClick={() => setOutlineOpen((open) => !open)}><BookOpen size={18} />{outlineOpen ? "Ocultar contenido del curso" : "Ver contenido del curso"}</button>
        </div>
        <div id="course-outline" className={`${outlineOpen ? "block" : "hidden"} divide-y divide-border lg:block`}>
          {data.blocks.map((block) => (
            <div key={block.id} className="p-4">
              <div className="flex justify-between gap-3"><h2 className="text-sm font-bold">{block.title}</h2><span className="text-xs text-text-secondary">{block.completionPercent}%</span></div>
              {block.topics.map((topic) => (
                <div key={topic.id} className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{topic.title} · {topic.completionPercent}%</p>
                  <div className="mt-2 space-y-1">
                    {topic.activities.map((activity) => (
                      <button
                        key={activity.id}
                        type="button"
                        disabled={activity.progress?.status === "LOCKED"}
                        onClick={() => { setSelectedId(activity.id); setOutlineOpen(false); }}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs ${
                          selectedId === activity.id ? "bg-primary/10 font-semibold text-primary" : "text-text-secondary hover:bg-surface-muted"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <ProgressIcon status={activity.progress?.status} />
                        <span className="min-w-0 break-words">{activity.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {certificateActivity && (
            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Finalización</p>
              <button type="button" disabled={certificateActivity.progress.status === "LOCKED"} onClick={() => { setSelectedId(certificateActivity.id); setOutlineOpen(false); }} className={`mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs ${selectedId === certificateActivity.id ? "bg-primary/10 font-semibold text-primary" : "text-text-secondary hover:bg-surface-muted"} disabled:cursor-not-allowed disabled:opacity-50`}>
                <ProgressIcon status={certificateActivity.progress.status} />
                <span>Reclama tu certificado</span>
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-6xl p-4 sm:p-6 xl:p-8">
        {error && <p className="mb-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div className="min-w-0 flex-[1_1_16rem] break-words"><p className="eyebrow">{activityTypeLabel(selected.type)}</p><h2 className="mt-2 page-title font-display font-bold">{selected.title}</h2><p className="mt-3 text-text-secondary">{selected.instructions || "Completa esta actividad para desbloquear el siguiente paso."}</p></div>
              <StatusBadge value={selected.progress?.status} />
            </div>
            <fieldset className="mt-7 min-w-0" disabled={selected.type === "CERTIFICATE_CLAIM" ? !can(user, "learning.claim_certificate") : !canParticipate}>
              <ActivityView
                key={selected.id}
                activity={selected}
                onComplete={load}
                onError={setError}
                onNext={nextActivity ? () => setSelectedId(nextActivity.id) : null}
              />
            </fieldset>
          </>
        ) : (
          <p className="text-text-secondary">Este curso no tiene actividades disponibles.</p>
        )}
      </main>
    </div>
  );
}

function ProgressIcon({ status }) {
  if (status === "LOCKED") return <Lock size={14} />;
  if (status === "COMPLETED") return <CheckCircle2 size={14} className="text-success" />;
  return <Circle size={14} />;
}

function CertificateClaimActivity({ activity, onComplete, onError }) {
  const [claiming, setClaiming] = useState(false);
  const certificate = activity.enrollment.certificate;
  if (certificate?.revokedAt) return <p role="status" className="panel p-6 text-error">Este certificado fue revocado. Contacta a la administración.</p>;

  async function claim() {
    setClaiming(true);
    try {
      await api(`/certificates/enrollments/${activity.enrollment.id}/claim`, { method: "POST" });
      await onComplete();
    } catch (requestError) {
      onError(requestError.message);
      setClaiming(false);
    }
  }

  async function download() {
    try {
      await downloadCertificatePng(certificate);
    } catch (downloadError) {
      onError(downloadError.message);
    }
  }

  return <div className="panel overflow-hidden"><div className="bg-gradient-to-br from-primary/15 via-surface to-secondary/15 p-8 text-center sm:p-12"><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-inverse shadow-lg"><Award size={40} /></span><p className="eyebrow mt-6">Curso completado</p><h3 className="mt-2 page-title font-display font-bold">{certificate ? "Tu certificado está listo" : "¡Felicidades por llegar al final!"}</h3><p className="mx-auto mt-4 max-w-xl leading-7 text-text-secondary">{certificate ? `Este certificado reconoce que completaste ${certificate.courseName}. Puedes descargarlo cuando quieras.` : "Reclama ahora tu certificado personalizado. Se guardará en tu cuenta y podrás descargarlo como imagen PNG."}</p>{certificate ? <button type="button" className="btn-primary mt-7" onClick={download}><Award size={17} /> Descargar certificado PNG</button> : <button type="button" className="btn-primary mt-7" onClick={claim} disabled={claiming}><Award size={17} /> {claiming ? "Generando certificado..." : "Reclamar mi certificado"}</button>}</div></div>;
}

function ActivityView({ activity, onComplete, onError, onNext }) {
  if (activity.type === "CERTIFICATE_CLAIM") return <CertificateClaimActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.progress?.status === "COMPLETED") {
    return (
      <div className="min-w-0">
        <div>
          <CompletedActivityReview activity={activity} />
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <div className="rounded-lg border border-success bg-success/10 p-6 text-success">
            <CheckCircle2 className="inline" /> <strong className="ml-2">Actividad completada.</strong>
            {activity.attempts?.[0]?.score != null && <span className="ml-2">Puntaje: {activity.attempts[0].score}/{activity.attempts[0].maxScore}.</span>}
          </div>
          {onNext && <button type="button" className="btn-primary mt-5" onClick={onNext}>Siguiente actividad <ArrowRight size={16} /></button>}
        </div>
      </div>
    );
  }
  if (activity.progress?.status === "PENDING_REVIEW") {
    return <div className="rounded-lg border border-warning bg-warning/10 p-6 text-warning"><ClipboardCheck className="inline" /> <strong className="ml-2">Tarea enviada.</strong> La siguiente actividad se habilitará después de la revisión del instructor.</div>;
  }
  if (activity.type === "COMPOSITE") return <CompositeActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "READING") return <ReadingActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "YOUTUBE_VIDEO") return <VideoActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (["EXTERNAL_LINK", "EMBEDDED_CONTENT", "INTERACTIVE_CONTENT"].includes(activity.type)) return <ContentActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (["QUESTIONS", "FINAL_EXAM", "INCORRECT_SECTION", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"].includes(activity.type)) return <GradedActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "ASSIGNMENT") return <AssignmentActivity activity={activity} onComplete={onComplete} onError={onError} />;
  return null;
}

const COMPOSITE_SCORED_TYPES = ["QUESTIONS", "INCORRECT_SECTION", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"];

function initialModuleResponse(module) {
  const content = module.content ?? {};
  if (["QUESTIONS", "CASE_STUDY"].includes(module.type)) return { answers: Array(content.questions?.length ?? 0).fill(null) };
  if (module.type === "TRUE_FALSE") return { answers: Array(content.statements?.length ?? 0).fill(null) };
  if (module.type === "MATCHING") return { matches: Array(content.leftItems?.length ?? 0).fill(null) };
  if (module.type === "ORDERING") return { order: (content.displayItems ?? []).map((item) => item.id) };
  if (module.type === "FILL_BLANKS") return { answers: Array(content.sentences?.length ?? 0).fill("") };
  if (module.type === "INCORRECT_SECTION") return { selectedIndices: [] };
  return {};
}

function CompositeActivity({ activity, onComplete, onError }) {
  const modules = activity.content?.modules ?? [];
  const [responses, setResponses] = useState(() => Object.fromEntries(modules.map((module) => [module.id, initialModuleResponse(module)])));
  const [submitting, setSubmitting] = useState(false);
  const [readyModules, setReadyModules] = useState({});
  const requirementsMet = modules.every(module => module.type === "YOUTUBE_VIDEO" || (module.type === "READING" && module.minimumReadSeconds > 0) ? readyModules[module.id] : true);
  const hasScoredBlocks = modules.some((module) => COMPOSITE_SCORED_TYPES.includes(module.type));

  function updateResponse(moduleId, nextResponse) {
    setResponses((current) => ({
      ...current,
      [moduleId]: typeof nextResponse === "function" ? nextResponse(current[moduleId] ?? {}) : nextResponse
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api(`/progress/activities/${activity.id}/composite`, { method: "POST", body: JSON.stringify({ responses }) });
      onComplete();
    } catch (requestError) {
      onError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {modules.map((module, index) => (
        <section key={module.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-text-secondary">{activityTypeLabel(module.type)}</p>{module.title && <h3 className="mt-0.5 font-bold">{module.title}</h3>}</div>
          </div>
          <div className="p-4 sm:p-6">
            <TimedModule activity={activity} module={module} response={responses[module.id] ?? {}} onChange={(next) => updateResponse(module.id, next)} onReady={(id, ready) => setReadyModules(current => current[id] === ready ? current : { ...current, [id]: ready })} />
          </div>
        </section>
      ))}
      <div className="flex justify-end border-t border-border pt-6">
        <button className="btn-primary" type="submit" disabled={submitting || !requirementsMet}><CheckCircle2 size={16} />{submitting ? "Enviando..." : hasScoredBlocks ? "Enviar y completar actividad" : "Completar actividad"}</button>
      </div>
    </form>
  );
}

function TimedModule({ activity, module, response, onChange, onReady }) {
  const { user } = useAuth();
  const [remaining, setRemaining] = useState(module.minimumReadSeconds ?? 0);
  const initial = activity.progress?.moduleProgress?.[module.id]?.watchedSeconds ?? 0;
  useEffect(() => {
    if (module.type !== "READING" || !can(user, "learning.participate")) return;
    let timer, active = true;
    api(`/progress/activities/${activity.id}/module-start`, { method: "POST", body: JSON.stringify({ moduleId: module.id }) }).then(result => {
      if (!active) return;
      const tick = () => { const left = Math.max(0, (module.minimumReadSeconds ?? 0) - (Date.now() - Date.parse(result.data.startedAt)) / 1000); setRemaining(Math.ceil(left)); onReady(module.id, left <= 0); };
      tick(); timer = setInterval(tick, 1000);
    }).catch(() => {});
    return () => { active = false; clearInterval(timer); };
  // The parent readiness updater is stable for this module's lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, module.id, module.type, module.minimumReadSeconds, user]);
  if (module.type === "YOUTUBE_VIDEO") return <TrackedVideo activityId={activity.id} moduleId={module.id} content={module.content} initialWatched={initial} minimumWatchPercent={module.minimumWatchPercent} enabled={can(user, "learning.participate")} onProgress={seconds => onReady(module.id, seconds >= module.content.durationSeconds * (module.minimumWatchPercent ?? 80) / 100)} />;
  return <><CompositeModule module={module} response={response} onChange={onChange} />{module.type === "READING" && module.minimumReadSeconds > 0 && <p className="mt-3 text-xs text-text-secondary">{remaining ? `Tiempo de lectura restante: ${remaining} segundos` : "Tiempo mínimo cumplido"}</p>}</>;
}

function CompositeModule({ module, response, onChange }) {
  const content = module.content ?? {};
  if (module.type === "IMAGE") {
    return <figure className="overflow-hidden rounded-xl border border-border bg-surface"><img src={content.url} alt={content.alt} className="max-h-[720px] w-full object-contain bg-surface-muted" />{content.caption && <figcaption className="flex gap-3 border-t border-border p-4 text-sm text-text-secondary"><ImageIcon className="mt-0.5 shrink-0 text-primary" size={17} /><span>{content.caption}</span></figcaption>}</figure>;
  }
  if (module.type === "READING") {
    return <div className="panel p-7"><BookOpen className="text-primary" /><div className="prose mt-5 max-w-none whitespace-pre-wrap leading-8 text-text-primary">{content.body}</div></div>;
  }
  if (module.type === "YOUTUBE_VIDEO") {
    const embedUrl = content.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
    return <div className="aspect-video overflow-hidden rounded-lg border border-border bg-overlay"><iframe className="size-full" src={embedUrl} title={module.title || "Video"} allowFullScreen /></div>;
  }
  if (module.type === "EXTERNAL_LINK") {
    return <div className="panel p-7"><ExternalLink className="text-primary" /><h3 className="mt-4 text-xl font-bold">{content.label}</h3><p className="mt-2 text-text-secondary">{content.description}</p><a className="btn-secondary mt-5" href={content.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Abrir recurso externo</a></div>;
  }
  if (module.type === "EMBEDDED_CONTENT") {
    return <div className="embedded-frame overflow-hidden rounded-lg border border-border bg-surface" style={{ height: content.height }}><iframe className="size-full" src={content.url} title={content.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /></div>;
  }
  if (module.type === "INTERACTIVE_CONTENT") return <InteractiveModule content={content} />;
  if (["QUESTIONS", "CASE_STUDY"].includes(module.type)) {
    return <div className="space-y-5">{module.type === "CASE_STUDY" && <div className="panel border-l-4 border-l-primary p-6"><p className="eyebrow">Escenario</p><p className="mt-3 whitespace-pre-wrap leading-7">{content.scenario}</p></div>}{content.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="panel p-6"><h3 className="font-bold leading-6">{questionIndex + 1}. {question.prompt}</h3><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={`${module.id}-question-${questionIndex}`} checked={response.answers?.[questionIndex] === optionIndex} onChange={() => onChange({ answers: response.answers.map((answer, index) => index === questionIndex ? optionIndex : answer) })} className="accent-primary" required />{option}</label>)}</div></fieldset>)}</div>;
  }
  if (module.type === "TRUE_FALSE") {
    return <div className="space-y-4">{content.statements.map((statement, index) => <fieldset key={index} className="panel p-5"><h3 className="font-bold leading-6">{index + 1}. {statement.prompt}</h3><div className="mt-4 flex flex-wrap gap-3">{[true, false].map((answer) => <label key={String(answer)} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 text-sm"><input type="radio" name={`${module.id}-statement-${index}`} checked={response.answers?.[index] === answer} onChange={() => onChange({ answers: response.answers.map((value, position) => position === index ? answer : value) })} required />{answer ? "Verdadero" : "Falso"}</label>)}</div></fieldset>)}</div>;
  }
  if (module.type === "MATCHING") {
    return <div className="panel space-y-4 p-6">{content.leftItems.map((item, index) => <label key={item.id} className="grid items-center gap-3 md:grid-cols-2"><span className="font-semibold">{item.text}</span><select className="input-field" value={response.matches?.[index] ?? ""} onChange={(event) => onChange({ matches: response.matches.map((value, position) => position === index ? Number(event.target.value) : value) })} required><option value="">Selecciona el concepto correspondiente</option>{content.rightItems.map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}</select></label>)}</div>;
  }
  if (module.type === "ORDERING") {
    const orderedItems = (response.order ?? []).map((id) => content.displayItems.find((item) => item.id === id)).filter(Boolean);
    const move = (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= orderedItems.length) return;
      const order = [...response.order];
      [order[index], order[target]] = [order[target], order[index]];
      onChange({ order });
    };
    return <div className="space-y-3">{orderedItems.map((item, index) => <div key={item.id} className="panel flex items-center gap-3 p-4"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><span className="flex-1 text-sm font-semibold">{item.text}</span><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, 1)} disabled={index === orderedItems.length - 1}><ArrowDown size={15} /></button></div>)}</div>;
  }
  if (module.type === "FILL_BLANKS") {
    return <div className="panel space-y-5 p-6">{content.sentences.map((sentence, index) => <label key={index} className="block"><span className="mb-2 block font-semibold">{index + 1}. {sentence.prompt}</span><input className="input-field" value={response.answers?.[index] ?? ""} onChange={(event) => onChange({ answers: response.answers.map((value, position) => position === index ? event.target.value : value) })} required /></label>)}</div>;
  }
  if (module.type === "INCORRECT_SECTION") {
    const selected = response.selectedIndices ?? [];
    const toggle = (index) => onChange({ selectedIndices: selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index] });
    return <div className="space-y-3"><p className="text-sm text-text-secondary">Selecciona todas las secciones que contengan un error.</p>{content.sections.map((section, index) => <button key={index} type="button" onClick={() => toggle(index)} className={`block w-full rounded-md border p-4 text-left text-sm leading-6 ${selected.includes(index) ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>{section.text}</button>)}</div>;
  }
  return null;
}

function InteractiveModule({ content }) {
  const [activeItem, setActiveItem] = useState(0);
  if (content.layout === "TABS") {
    return <div className="panel overflow-hidden"><div className="flex flex-wrap border-b border-border bg-surface-muted">{content.items.map((item, index) => <button key={index} type="button" className={`px-5 py-3 text-sm font-semibold ${activeItem === index ? "bg-surface text-primary" : "text-text-secondary"}`} onClick={() => setActiveItem(index)}>{item.title}</button>)}</div><div className="whitespace-pre-wrap p-6 leading-7">{content.items[activeItem]?.body}</div></div>;
  }
  if (content.layout === "ACCORDION") {
    return <div className="space-y-3">{content.items.map((item, index) => <details key={index} className="panel p-5" open={index === 0}><summary className="cursor-pointer font-bold">{item.title}</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></details>)}</div>;
  }
  return <div className="grid gap-4 md:grid-cols-2">{content.items.map((item, index) => <article key={index} className="panel p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></article>)}</div>;
}

function CompletedActivityReview({ activity }) {
  const content = activity.content ?? {};
  const latestAttempt = activity.attempts?.[0];

  if (activity.type === "COMPOSITE") {
    return <div className="space-y-6">{(content.modules ?? []).map((module, index) => { const moduleAttempt = latestAttempt ? { ...latestAttempt, response: latestAttempt.response?.modules?.[module.id], feedback: latestAttempt.feedback?.[module.id] } : null; return <section key={module.id} className="min-w-0"><div className="mb-3 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div><p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{activityTypeLabel(module.type)}</p>{module.title && <h3 className="font-bold">{module.title}</h3>}</div></div><CompletedActivityReview activity={{ ...activity, type: module.type, title: module.title || activity.title, content: module.content, attempts: moduleAttempt ? [moduleAttempt] : [] }} /></section>; })}</div>;
  }

  if (activity.type === "READING") {
    return <div className="panel p-7"><BookOpen className="text-primary" /><h3 className="mt-4 text-lg font-bold">Contenido de la actividad</h3><div className="prose mt-4 max-w-none whitespace-pre-wrap leading-8 text-text-primary">{content.body}</div></div>;
  }
  if (activity.type === "IMAGE") {
    return <figure className="overflow-hidden rounded-xl border border-border bg-surface"><img src={content.url} alt={content.alt} className="max-h-[720px] w-full object-contain bg-surface-muted" />{content.caption && <figcaption className="p-4 text-sm text-text-secondary">{content.caption}</figcaption>}</figure>;
  }
  if (activity.type === "YOUTUBE_VIDEO") {
    const embedUrl = content.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
    return <div className="aspect-video overflow-hidden rounded-lg border border-border bg-overlay"><iframe className="size-full" src={embedUrl} title={activity.title} allowFullScreen /></div>;
  }
  if (activity.type === "EXTERNAL_LINK") {
    return <div className="panel p-6"><h3 className="font-bold">{content.label}</h3><p className="mt-2 text-sm text-text-secondary">{content.description}</p><a className="btn-secondary mt-4" href={content.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir recurso externo</a></div>;
  }
  if (activity.type === "EMBEDDED_CONTENT") {
    return <div className="embedded-frame overflow-hidden rounded-lg border border-border bg-surface" style={{ height: content.height }}><iframe className="size-full" src={content.url} title={content.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /></div>;
  }
  if (activity.type === "INTERACTIVE_CONTENT") {
    return <div className="grid gap-4 md:grid-cols-2">{content.items.map((item, index) => <article key={index} className="panel p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></article>)}</div>;
  }
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(activity.type)) {
    return <div className="min-w-0 space-y-4">{activity.type === "CASE_STUDY" && <div className="panel min-w-0 border-l-4 border-l-primary p-6"><p className="eyebrow">Escenario</p><p className="mt-3 whitespace-pre-wrap break-words leading-7">{content.scenario}</p></div>}{content.questions.map((question, index) => {
      const result = latestAttempt?.feedback?.[index];
      return <div key={index} className="panel min-w-0 overflow-hidden p-5"><h3 className="break-words font-bold">{index + 1}. {question.prompt}</h3><ul className="mt-3 min-w-0 space-y-2 text-sm">{question.options.map((option, optionIndex) => {
        const isSelected = result?.selectedIndex === optionIndex;
        const isCorrect = result?.correctIndex === optionIndex;
        const stateClass = isCorrect ? "border-success bg-success/10 font-semibold text-success" : isSelected ? "border-error bg-error/10 font-semibold text-error" : "border-border text-text-secondary";
        return <li key={optionIndex} className={`min-w-0 break-words rounded-md border p-3 ${stateClass}`}>{option}{isCorrect && <span className="ml-2">✓ Correcta</span>}{isSelected && !isCorrect && <span className="ml-2">✕ Tu respuesta</span>}</li>;
      })}</ul>{result && <p className={`mt-3 text-sm font-semibold ${result.correct ? "text-success" : "text-error"}`}>{result.correct ? "Respuesta correcta" : "Respuesta incorrecta"}</p>}</div>;
    })}{latestAttempt?.score != null && <div className="rounded-lg border border-border bg-surface-muted p-5 text-sm"><span className="font-semibold">Resultado:</span> {latestAttempt.score}/{latestAttempt.maxScore} puntos</div>}</div>;
  }
  if (activity.type === "TRUE_FALSE") {
    return <div className="space-y-3">{content.statements.map((statement, index) => <div key={index} className="panel p-5 font-semibold">{index + 1}. {statement.prompt}</div>)}</div>;
  }
  if (activity.type === "MATCHING") {
    return <div className="panel grid gap-5 p-6 md:grid-cols-2"><div><h3 className="font-bold">Conceptos</h3>{content.leftItems.map((item) => <p key={item.id} className="mt-2 rounded-md border border-border p-3 text-sm">{item.text}</p>)}</div><div><h3 className="font-bold">Correspondencias posibles</h3>{content.rightItems.map((item) => <p key={item.id} className="mt-2 rounded-md border border-border p-3 text-sm">{item.text}</p>)}</div></div>;
  }
  if (activity.type === "ORDERING") {
    const submittedOrder = latestAttempt?.response?.order ?? content.displayItems.map((item) => item.id);
    return <div className="space-y-2">{submittedOrder.map((itemId, index) => { const item = content.displayItems.find((candidate) => candidate.id === itemId); const correct = latestAttempt?.feedback?.[index]?.correct; return <div key={itemId} className={`flex items-center gap-3 rounded-lg border p-4 ${correct ? "border-success bg-success/10 text-success" : "border-error bg-error/10 text-error"}`}><span className="grid size-8 place-items-center rounded-full bg-surface text-sm font-bold">{index + 1}</span><span className="flex-1 text-sm font-semibold">{item?.text}</span><strong className="text-xs">{correct ? "Correcto" : "Posición incorrecta"}</strong></div>; })}</div>;
  }
  if (activity.type === "FILL_BLANKS") {
    return <div className="panel space-y-4 p-6">{content.sentences.map((sentence, index) => <p key={index} className="font-semibold">{index + 1}. {sentence.prompt}</p>)}</div>;
  }
  if (activity.type === "INCORRECT_SECTION") {
    return <div className="space-y-3">{content.sections.map((section, index) => <p key={index} className="panel p-4 text-sm leading-6">{section.text}</p>)}</div>;
  }
  if (activity.type === "ASSIGNMENT") {
    return <div className="panel p-6"><h3 className="font-bold">Campos de la tarea</h3><ul className="mt-3 space-y-2 text-sm text-text-secondary">{content.fields.map((field, index) => <li key={index} className="rounded-md border border-border p-3">{field.label}</li>)}</ul></div>;
  }
  return null;
}

function GradedActivity({ activity, onComplete, onError }) {
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(activity.type)) {
    return <QuestionActivity activity={activity} onComplete={onComplete} onError={onError} />;
  }
  if (activity.type === "INCORRECT_SECTION") return <IncorrectSectionActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "TRUE_FALSE") return <TrueFalseActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "MATCHING") return <MatchingActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "ORDERING") return <OrderingActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "FILL_BLANKS") return <FillBlanksActivity activity={activity} onComplete={onComplete} onError={onError} />;
  return null;
}

function ReadingActivity({ activity, onComplete, onError }) {
  const startedAt = activity.progress?.startedAt ? new Date(activity.progress.startedAt).getTime() : Date.now();
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const remaining = Math.max(0, activity.minimumReadSeconds - elapsed);
  async function complete() {
    try {
      await api(`/progress/activities/${activity.id}/reading`, { method: "POST", body: JSON.stringify({ confirmed: true }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <div className="panel p-7"><BookOpen className="text-primary" /><div className="prose mt-5 max-w-none whitespace-pre-wrap leading-8 text-text-primary">{activity.content.body}</div><div className="mt-8 border-t border-border pt-5"><p className="text-sm text-text-secondary">{remaining ? `Tiempo mínimo de lectura: faltan ${remaining} segundos` : "Tiempo mínimo cumplido. Confirma que terminaste."}</p><button type="button" className="btn-primary mt-4" disabled={remaining > 0} onClick={complete}><CheckCircle2 size={16} /> He leído y comprendido este contenido</button></div></div>;
}

function VideoActivity({ activity, onComplete, onError }) {
  const { user } = useAuth();
  const [watched, setWatched] = useState(activity.progress?.watchedSeconds ?? 0);
  const required = Math.ceil(activity.content.durationSeconds * activity.minimumWatchPercent / 100);
  async function complete() {
    try {
      const result = await api(`/progress/activities/${activity.id}/video`, { method: "POST", body: JSON.stringify({ watchedSeconds: watched, durationSeconds: activity.content.durationSeconds }) });
      if (!result.data.completed) return onError("Aún no se completa la reproducción requerida");
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <div className="space-y-4"><TrackedVideo activityId={activity.id} content={activity.content} minimumWatchPercent={activity.minimumWatchPercent} initialWatched={watched} onProgress={setWatched} enabled={can(user, "learning.participate")} /><button type="button" className="btn-primary" disabled={watched < required} onClick={complete}><PlayCircle size={16} />Confirmar reproducción</button></div>;
}

function QuestionActivity({ activity, onComplete, onError }) {
  const [answers, setAnswers] = useState(Array(activity.content.questions.length).fill(null));
  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { answers } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <form onSubmit={submit} className="space-y-5">{activity.type === "CASE_STUDY" && <div className="panel border-l-4 border-l-primary p-6"><p className="eyebrow">Escenario</p><p className="mt-3 whitespace-pre-wrap leading-7">{activity.content.scenario}</p></div>}{activity.content.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="panel p-6"><h3 className="font-bold leading-6">{questionIndex + 1}. {question.prompt}</h3><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers(answers.map((answer, index) => index === questionIndex ? optionIndex : answer))} className="accent-primary" required /> {option}</label>)}</div></fieldset>)}<button className="btn-primary" type="submit"><Send size={16} /> Enviar {activity.type === "FINAL_EXAM" ? "examen final" : "respuestas"}</button></form>;
}

function ContentActivity({ activity, onComplete, onError }) {
  const [activeItem, setActiveItem] = useState(0);
  async function complete() {
    try {
      await api(`/progress/activities/${activity.id}/content`, { method: "POST", body: JSON.stringify({ confirmed: true }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }

  if (activity.type === "EXTERNAL_LINK") {
    return <div className="panel p-7"><ExternalLink className="text-primary" /><h3 className="mt-4 text-xl font-bold">{activity.content.label}</h3><p className="mt-2 text-text-secondary">{activity.content.description}</p><a className="btn-secondary mt-5" href={activity.content.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir recurso externo</a><div className="mt-6 border-t border-border pt-5"><button type="button" className="btn-primary" onClick={complete}><CheckCircle2 size={16} /> Marcar recurso como revisado</button></div></div>;
  }

  if (activity.type === "EMBEDDED_CONTENT") {
    return <div><div className="overflow-hidden rounded-lg border border-border bg-surface" style={{ height: activity.content.height }}><iframe className="size-full" src={activity.content.url} title={activity.content.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /></div><button type="button" className="btn-primary mt-5" onClick={complete}><CheckCircle2 size={16} /> Marcar contenido incrustado como revisado</button></div>;
  }

  const { layout, items } = activity.content;
  return <div><div className={layout === "CARDS" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>{layout === "ACCORDION" && items.map((item, index) => <details key={index} className="panel p-5" open={index === 0}><summary className="cursor-pointer font-bold">{item.title}</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></details>)}{layout === "CARDS" && items.map((item, index) => <article key={index} className="panel p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></article>)}{layout === "TABS" && <div className="panel overflow-hidden"><div className="flex flex-wrap border-b border-border bg-surface-muted">{items.map((item, index) => <button key={index} type="button" className={`px-5 py-3 text-sm font-semibold ${activeItem === index ? "bg-surface text-primary" : "text-text-secondary"}`} onClick={() => setActiveItem(index)}>{item.title}</button>)}</div><div className="p-6 whitespace-pre-wrap leading-7">{items[activeItem]?.body}</div></div>}</div><button type="button" className="btn-primary mt-5" onClick={complete}><CheckCircle2 size={16} /> Completar contenido interactivo</button></div>;
}

function TrueFalseActivity({ activity, onComplete, onError }) {
  const [answers, setAnswers] = useState(Array(activity.content.statements.length).fill(null));
  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { answers } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <form onSubmit={submit} className="space-y-4">{activity.content.statements.map((statement, index) => <fieldset key={index} className="panel p-5"><h3 className="font-bold leading-6">{index + 1}. {statement.prompt}</h3><div className="mt-4 flex flex-wrap gap-3">{[true, false].map((answer) => <label key={String(answer)} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 text-sm"><input type="radio" name={`statement-${index}`} checked={answers[index] === answer} onChange={() => setAnswers(answers.map((value, position) => position === index ? answer : value))} required /> {answer ? "Verdadero" : "Falso"}</label>)}</div></fieldset>)}<button className="btn-primary" type="submit"><Send size={16} /> Enviar respuestas</button></form>;
}

function MatchingActivity({ activity, onComplete, onError }) {
  const [matches, setMatches] = useState(Array(activity.content.leftItems.length).fill(null));
  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { matches } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <form onSubmit={submit} className="panel space-y-4 p-6">{activity.content.leftItems.map((item, index) => <label key={item.id} className="grid items-center gap-3 md:grid-cols-2"><span className="font-semibold">{item.text}</span><select className="input-field" value={matches[index] ?? ""} onChange={(event) => setMatches(matches.map((value, position) => position === index ? Number(event.target.value) : value))} required><option value="">Selecciona el concepto correspondiente</option>{activity.content.rightItems.map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}</select></label>)}<button className="btn-primary" type="submit"><Send size={16} /> Enviar correspondencias</button></form>;
}

function OrderingActivity({ activity, onComplete, onError }) {
  const [items, setItems] = useState(activity.content.displayItems);
  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }
  async function submit() {
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { order: items.map((item) => item.id) } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <div className="space-y-3">{items.map((item, index) => <div key={item.id} className="panel flex items-center gap-3 p-4"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><span className="flex-1 text-sm font-semibold">{item.text}</span><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={15} /></button></div>)}<button type="button" className="btn-primary" onClick={submit}><Send size={16} /> Enviar orden</button></div>;
}

function FillBlanksActivity({ activity, onComplete, onError }) {
  const [answers, setAnswers] = useState(Array(activity.content.sentences.length).fill(""));
  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { answers } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <form onSubmit={submit} className="panel space-y-5 p-6">{activity.content.sentences.map((sentence, index) => <label key={index} className="block"><span className="mb-2 block font-semibold">{index + 1}. {sentence.prompt}</span><input className="input-field" value={answers[index]} onChange={(event) => setAnswers(answers.map((value, position) => position === index ? event.target.value : value))} required /></label>)}<button className="btn-primary" type="submit"><Send size={16} /> Enviar respuestas</button></form>;
}

function IncorrectSectionActivity({ activity, onComplete, onError }) {
  const [selected, setSelected] = useState([]);
  function toggle(index) { setSelected((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index]); }
  async function submit() {
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: { selectedIndices: selected.sort() } }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <div className="space-y-3"><p className="text-sm text-text-secondary">Selecciona todas las secciones que contengan un error.</p>{activity.content.sections.map((section, index) => <button key={index} type="button" onClick={() => toggle(index)} className={`block w-full rounded-md border p-4 text-left text-sm leading-6 ${selected.includes(index) ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>{section.text}</button>)}<button type="button" className="btn-primary mt-3" disabled={!selected.length} onClick={submit}><FileQuestion size={16} /> Enviar selección</button></div>;
}

function AssignmentActivity({ activity, onComplete, onError }) {
  const [values, setValues] = useState({});
  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/progress/activities/${activity.id}/attempts`, { method: "POST", body: JSON.stringify({ response: values }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <form onSubmit={submit} className="panel space-y-5 p-6">{activity.content.fields.map((field, index) => <label key={index} className="block"><span className="mb-2 block text-sm font-semibold">{field.label}</span>{field.type === "textarea" ? <textarea className="input-field min-h-32" required={field.required} value={values[field.label] ?? ""} onChange={(event) => setValues({ ...values, [field.label]: event.target.value })} /> : <input className="input-field" type={field.type} required={field.required} value={values[field.label] ?? ""} onChange={(event) => setValues({ ...values, [field.label]: event.target.value })} />}</label>)}<button className="btn-primary" type="submit"><FileText size={16} /> Enviar tarea para revisión</button></form>;
}
