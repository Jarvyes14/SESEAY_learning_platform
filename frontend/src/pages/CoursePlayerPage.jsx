import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileQuestion,
  FileText,
  Lock,
  PlayCircle,
  Send
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";

export default function CoursePlayerPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

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

  const activities = useMemo(
    () => data?.blocks.flatMap((block) => block.topics.flatMap((topic) => topic.activities)) ?? [],
    [data]
  );
  const selected = activities.find((activity) => activity.id === selectedId);

  useEffect(() => {
    if (selected && selected.progress?.status === "AVAILABLE") {
      api(`/progress/activities/${selected.id}/start`, { method: "POST" }).then(load).catch((requestError) => setError(requestError.message));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return <div className="container-page py-16 text-center text-text-secondary">{error || "Loading class..."}</div>;
  }

  return (
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[330px_1fr]">
      <aside className="border-r border-border bg-surface">
        <div className="border-b border-border p-5">
          <Link to="/student" className="text-xs font-semibold text-primary">← My courses</Link>
          <h1 className="mt-2 font-bold">{data.enrollment.course.title}</h1>
          <div className="mt-4"><ProgressBar value={data.enrollment.courseProgress?.completionPercent ?? 0} label="Course progress" compact /></div>
        </div>
        <div className="divide-y divide-border">
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
                        onClick={() => setSelectedId(activity.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs ${
                          selectedId === activity.id ? "bg-primary/10 font-semibold text-primary" : "text-text-secondary hover:bg-surface-muted"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <ProgressIcon status={activity.progress?.status} />
                        {activity.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-7 lg:p-10">
        {error && <p className="mb-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div><p className="eyebrow">{selected.type.replaceAll("_", " ")}</p><h2 className="mt-2 font-display text-3xl font-bold">{selected.title}</h2><p className="mt-3 text-text-secondary">{selected.instructions || "Complete this activity to unlock the next step."}</p></div>
              <StatusBadge value={selected.progress?.status} />
            </div>
            <div className="mt-7">
              <ActivityView activity={selected} onComplete={load} onError={setError} />
            </div>
          </>
        ) : (
          <p className="text-text-secondary">This course has no accessible activities.</p>
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

function ActivityView({ activity, onComplete, onError }) {
  if (activity.progress?.status === "COMPLETED") {
    const canRetry =
      ["QUESTIONS", "FINAL_EXAM", "INCORRECT_SECTION"].includes(activity.type) &&
      (!activity.maxAttempts || activity.attempts.length < activity.maxAttempts);
    return (
      <div>
        <div className="rounded-lg border border-success bg-success/10 p-6 text-success">
          <CheckCircle2 className="inline" /> <strong className="ml-2">Activity completed.</strong>
          {activity.attempts?.[0]?.score !== null && (
            <span className="ml-2">
              Latest score: {activity.attempts[0].score}/{activity.attempts[0].maxScore}.
            </span>
          )}
        </div>
        {canRetry && (
          <div className="mt-6">
            <h3 className="mb-4 font-bold">Optional retry ({activity.attempts.length}/{activity.maxAttempts ?? "unlimited"} attempts used)</h3>
            {["QUESTIONS", "FINAL_EXAM"].includes(activity.type) ? (
              <QuestionActivity activity={activity} onComplete={onComplete} onError={onError} />
            ) : (
              <IncorrectSectionActivity activity={activity} onComplete={onComplete} onError={onError} />
            )}
          </div>
        )}
      </div>
    );
  }
  if (activity.progress?.status === "PENDING_REVIEW") {
    return <div className="rounded-lg border border-warning bg-warning/10 p-6 text-warning"><ClipboardCheck className="inline" /> <strong className="ml-2">Assignment submitted.</strong> The next activity unlocks after instructor review.</div>;
  }
  if (activity.type === "READING") return <ReadingActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "YOUTUBE_VIDEO") return <VideoActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (["QUESTIONS", "FINAL_EXAM"].includes(activity.type)) return <QuestionActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "INCORRECT_SECTION") return <IncorrectSectionActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "ASSIGNMENT") return <AssignmentActivity activity={activity} onComplete={onComplete} onError={onError} />;
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
  return <div className="panel p-7"><BookOpen className="text-primary" /><div className="prose mt-5 max-w-none whitespace-pre-wrap leading-8 text-text-primary">{activity.content.body}</div><div className="mt-8 border-t border-border pt-5"><p className="text-sm text-text-secondary">{remaining ? `Minimum reading time: ${remaining} seconds remaining` : "Minimum reading time met. Confirm your completion."}</p><button type="button" className="btn-primary mt-4" disabled={remaining > 0} onClick={complete}><CheckCircle2 size={16} /> I have read and understood this content</button></div></div>;
}

function VideoActivity({ activity, onComplete, onError }) {
  const [watched, setWatched] = useState(activity.progress?.watchedSeconds ?? 0);
  const duration = activity.content.durationSeconds;
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setWatched((value) => Math.min(duration, value + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [duration]);
  const required = Math.ceil((duration * activity.minimumWatchPercent) / 100);
  const embedUrl = activity.content.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
  async function complete() {
    try {
      await api(`/progress/activities/${activity.id}/video`, { method: "POST", body: JSON.stringify({ watchedSeconds: watched, durationSeconds: duration }) });
      onComplete();
    } catch (requestError) { onError(requestError.message); }
  }
  return <div><div className="aspect-video overflow-hidden rounded-lg border border-border bg-overlay"><iframe className="size-full" src={embedUrl} title={activity.title} allowFullScreen /></div><div className="panel mt-5 p-5"><ProgressBar value={Math.min(100, (watched / duration) * 100)} label="Tracked watch time" /><p className="mt-3 text-xs text-text-secondary">Keep this class visible while watching. Required: {required} of {duration} seconds.</p><button type="button" className="btn-primary mt-4" disabled={watched < required} onClick={complete}><PlayCircle size={16} /> Confirm watched portion</button></div></div>;
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
  return <form onSubmit={submit} className="space-y-5">{activity.content.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="panel p-6"><legend className="font-bold">{questionIndex + 1}. {question.prompt}</legend><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers(answers.map((answer, index) => index === questionIndex ? optionIndex : answer))} className="accent-primary" required /> {option}</label>)}</div></fieldset>)}<button className="btn-primary" type="submit"><Send size={16} /> Submit {activity.type === "FINAL_EXAM" ? "final exam" : "answers"}</button></form>;
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
  return <div className="space-y-3"><p className="text-sm text-text-secondary">Select every section that contains an error.</p>{activity.content.sections.map((section, index) => <button key={index} type="button" onClick={() => toggle(index)} className={`block w-full rounded-md border p-4 text-left text-sm leading-6 ${selected.includes(index) ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>{section.text}</button>)}<button type="button" className="btn-primary mt-3" disabled={!selected.length} onClick={submit}><FileQuestion size={16} /> Submit identification</button></div>;
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
  return <form onSubmit={submit} className="panel space-y-5 p-6">{activity.content.fields.map((field, index) => <label key={index} className="block"><span className="mb-2 block text-sm font-semibold">{field.label}</span>{field.type === "textarea" ? <textarea className="input-field min-h-32" required={field.required} value={values[field.label] ?? ""} onChange={(event) => setValues({ ...values, [field.label]: event.target.value })} /> : <input className="input-field" type={field.type} required={field.required} value={values[field.label] ?? ""} onChange={(event) => setValues({ ...values, [field.label]: event.target.value })} />}</label>)}<button className="btn-primary" type="submit"><FileText size={16} /> Submit assignment for review</button></form>;
}
