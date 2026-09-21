import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileQuestion,
  FileText,
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
  const selectedIndex = activities.findIndex((activity) => activity.id === selectedId);
  const nextActivity = selectedIndex >= 0
    ? activities.slice(selectedIndex + 1).find((activity) => activity.progress?.status !== "LOCKED")
    : null;

  useEffect(() => {
    if (selected && selected.progress?.status === "AVAILABLE") {
      api(`/progress/activities/${selected.id}/start`, { method: "POST" }).then(load).catch((requestError) => setError(requestError.message));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return <div className="container-page py-16 text-center text-text-secondary">{error || "Loading class..."}</div>;
  }

  return (
    <div className="grid min-h-[calc(100vh-65px)] min-w-0 lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="min-w-0 border-r border-border bg-surface">
        <div className="border-b border-border p-5">
          <Link to="/learning" className="text-xs font-semibold text-primary">← My courses</Link>
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
                        <span className="min-w-0 break-words">{activity.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
      <main className="mx-auto min-w-0 w-full max-w-5xl overflow-hidden p-5 sm:p-7 lg:p-10">
        {error && <p className="mb-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div className="min-w-0 flex-1 break-words"><p className="eyebrow">{selected.type.replaceAll("_", " ")}</p><h2 className="mt-2 font-display text-3xl font-bold">{selected.title}</h2><p className="mt-3 text-text-secondary">{selected.instructions || "Complete this activity to unlock the next step."}</p></div>
              <StatusBadge value={selected.progress?.status} />
            </div>
            <div className="mt-7">
              <ActivityView
                activity={selected}
                onComplete={load}
                onError={setError}
                onNext={nextActivity ? () => setSelectedId(nextActivity.id) : null}
              />
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

function ActivityView({ activity, onComplete, onError, onNext }) {
  if (activity.progress?.status === "COMPLETED") {
    return (
      <div className="min-w-0">
        <div className="rounded-lg border border-success bg-success/10 p-6 text-success">
          <CheckCircle2 className="inline" /> <strong className="ml-2">Activity completed.</strong>
          {activity.attempts?.[0]?.score != null && (
            <span className="ml-2">
              Latest score: {activity.attempts[0].score}/{activity.attempts[0].maxScore}.
            </span>
          )}
        </div>
        {onNext && (
          <button type="button" className="btn-primary mt-5" onClick={onNext}>
            Next activity <ArrowRight size={16} />
          </button>
        )}
        <div className="mt-6">
          <CompletedActivityReview activity={activity} />
        </div>
      </div>
    );
  }
  if (activity.progress?.status === "PENDING_REVIEW") {
    return <div className="rounded-lg border border-warning bg-warning/10 p-6 text-warning"><ClipboardCheck className="inline" /> <strong className="ml-2">Assignment submitted.</strong> The next activity unlocks after instructor review.</div>;
  }
  if (activity.type === "READING") return <ReadingActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "YOUTUBE_VIDEO") return <VideoActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (["EXTERNAL_LINK", "EMBEDDED_CONTENT", "INTERACTIVE_CONTENT"].includes(activity.type)) return <ContentActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (["QUESTIONS", "FINAL_EXAM", "INCORRECT_SECTION", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"].includes(activity.type)) return <GradedActivity activity={activity} onComplete={onComplete} onError={onError} />;
  if (activity.type === "ASSIGNMENT") return <AssignmentActivity activity={activity} onComplete={onComplete} onError={onError} />;
  return null;
}

function CompletedActivityReview({ activity }) {
  const content = activity.content ?? {};
  const latestAttempt = activity.attempts?.[0];

  if (activity.type === "READING") {
    return <div className="panel p-7"><BookOpen className="text-primary" /><h3 className="mt-4 text-lg font-bold">Activity content</h3><div className="prose mt-4 max-w-none whitespace-pre-wrap leading-8 text-text-primary">{content.body}</div></div>;
  }
  if (activity.type === "YOUTUBE_VIDEO") {
    const embedUrl = content.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
    return <div className="aspect-video overflow-hidden rounded-lg border border-border bg-overlay"><iframe className="size-full" src={embedUrl} title={activity.title} allowFullScreen /></div>;
  }
  if (activity.type === "EXTERNAL_LINK") {
    return <div className="panel p-6"><h3 className="font-bold">{content.label}</h3><p className="mt-2 text-sm text-text-secondary">{content.description}</p><a className="btn-secondary mt-4" href={content.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open external resource</a></div>;
  }
  if (activity.type === "EMBEDDED_CONTENT") {
    return <div className="overflow-hidden rounded-lg border border-border bg-surface" style={{ height: content.height }}><iframe className="size-full" src={content.url} title={content.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /></div>;
  }
  if (activity.type === "INTERACTIVE_CONTENT") {
    return <div className="grid gap-4 md:grid-cols-2">{content.items.map((item, index) => <article key={index} className="panel p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></article>)}</div>;
  }
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(activity.type)) {
    return <div className="min-w-0 space-y-4">{activity.type === "CASE_STUDY" && <div className="panel min-w-0 border-l-4 border-l-primary p-6"><p className="eyebrow">Scenario</p><p className="mt-3 whitespace-pre-wrap break-words leading-7">{content.scenario}</p></div>}{content.questions.map((question, index) => {
      const result = latestAttempt?.feedback?.[index];
      return <div key={index} className="panel min-w-0 overflow-hidden p-5"><h3 className="break-words font-bold">{index + 1}. {question.prompt}</h3><ul className="mt-3 min-w-0 space-y-2 text-sm">{question.options.map((option, optionIndex) => {
        const isSelected = result?.selectedIndex === optionIndex;
        const stateClass = isSelected
          ? result.correct
            ? "border-success bg-success/10 font-semibold text-success"
            : "border-error bg-error/10 font-semibold text-error"
          : "border-border text-text-secondary";
        return <li key={optionIndex} className={`min-w-0 break-words rounded-md border p-3 ${stateClass}`}>{option}</li>;
      })}</ul>{result && <p className={`mt-3 text-sm font-semibold ${result.correct ? "text-success" : "text-error"}`}>{result.correct ? "Correct answer" : "Incorrect answer"}</p>}</div>;
    })}{latestAttempt?.score != null && <div className="rounded-lg border border-border bg-surface-muted p-5 text-sm"><span className="font-semibold">Result:</span> {latestAttempt.score}/{latestAttempt.maxScore} points</div>}</div>;
  }
  if (activity.type === "TRUE_FALSE") {
    return <div className="space-y-3">{content.statements.map((statement, index) => <div key={index} className="panel p-5 font-semibold">{index + 1}. {statement.prompt}</div>)}</div>;
  }
  if (activity.type === "MATCHING") {
    return <div className="panel grid gap-5 p-6 md:grid-cols-2"><div><h3 className="font-bold">Concepts</h3>{content.leftItems.map((item) => <p key={item.id} className="mt-2 rounded-md border border-border p-3 text-sm">{item.text}</p>)}</div><div><h3 className="font-bold">Possible matches</h3>{content.rightItems.map((item) => <p key={item.id} className="mt-2 rounded-md border border-border p-3 text-sm">{item.text}</p>)}</div></div>;
  }
  if (activity.type === "ORDERING") {
    return <div className="space-y-2">{content.displayItems.map((item, index) => <div key={item.id} className="panel flex items-center gap-3 p-4"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><span className="text-sm font-semibold">{item.text}</span></div>)}</div>;
  }
  if (activity.type === "FILL_BLANKS") {
    return <div className="panel space-y-4 p-6">{content.sentences.map((sentence, index) => <p key={index} className="font-semibold">{index + 1}. {sentence.prompt}</p>)}</div>;
  }
  if (activity.type === "INCORRECT_SECTION") {
    return <div className="space-y-3">{content.sections.map((section, index) => <p key={index} className="panel p-4 text-sm leading-6">{section.text}</p>)}</div>;
  }
  if (activity.type === "ASSIGNMENT") {
    return <div className="panel p-6"><h3 className="font-bold">Assignment fields</h3><ul className="mt-3 space-y-2 text-sm text-text-secondary">{content.fields.map((field, index) => <li key={index} className="rounded-md border border-border p-3">{field.label}</li>)}</ul></div>;
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
  return <form onSubmit={submit} className="space-y-5">{activity.type === "CASE_STUDY" && <div className="panel border-l-4 border-l-primary p-6"><p className="eyebrow">Scenario</p><p className="mt-3 whitespace-pre-wrap leading-7">{activity.content.scenario}</p></div>}{activity.content.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="panel p-6"><legend className="font-bold">{questionIndex + 1}. {question.prompt}</legend><div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers(answers.map((answer, index) => index === questionIndex ? optionIndex : answer))} className="accent-primary" required /> {option}</label>)}</div></fieldset>)}<button className="btn-primary" type="submit"><Send size={16} /> Submit {activity.type === "FINAL_EXAM" ? "final exam" : "answers"}</button></form>;
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
    return <div className="panel p-7"><ExternalLink className="text-primary" /><h3 className="mt-4 text-xl font-bold">{activity.content.label}</h3><p className="mt-2 text-text-secondary">{activity.content.description}</p><a className="btn-secondary mt-5" href={activity.content.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open external resource</a><div className="mt-6 border-t border-border pt-5"><button type="button" className="btn-primary" onClick={complete}><CheckCircle2 size={16} /> Mark resource as reviewed</button></div></div>;
  }

  if (activity.type === "EMBEDDED_CONTENT") {
    return <div><div className="overflow-hidden rounded-lg border border-border bg-surface" style={{ height: activity.content.height }}><iframe className="size-full" src={activity.content.url} title={activity.content.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /></div><button type="button" className="btn-primary mt-5" onClick={complete}><CheckCircle2 size={16} /> Mark embedded content as reviewed</button></div>;
  }

  const { layout, items } = activity.content;
  return <div><div className={layout === "CARDS" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>{layout === "ACCORDION" && items.map((item, index) => <details key={index} className="panel p-5" open={index === 0}><summary className="cursor-pointer font-bold">{item.title}</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></details>)}{layout === "CARDS" && items.map((item, index) => <article key={index} className="panel p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">{item.body}</p></article>)}{layout === "TABS" && <div className="panel overflow-hidden"><div className="flex flex-wrap border-b border-border bg-surface-muted">{items.map((item, index) => <button key={index} type="button" className={`px-5 py-3 text-sm font-semibold ${activeItem === index ? "bg-surface text-primary" : "text-text-secondary"}`} onClick={() => setActiveItem(index)}>{item.title}</button>)}</div><div className="p-6 whitespace-pre-wrap leading-7">{items[activeItem]?.body}</div></div>}</div><button type="button" className="btn-primary mt-5" onClick={complete}><CheckCircle2 size={16} /> Complete interactive content</button></div>;
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
  return <form onSubmit={submit} className="space-y-4">{activity.content.statements.map((statement, index) => <fieldset key={index} className="panel p-5"><legend className="font-bold">{index + 1}. {statement.prompt}</legend><div className="mt-4 flex gap-3">{[true, false].map((answer) => <label key={String(answer)} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-3 text-sm"><input type="radio" name={`statement-${index}`} checked={answers[index] === answer} onChange={() => setAnswers(answers.map((value, position) => position === index ? answer : value))} required /> {answer ? "True" : "False"}</label>)}</div></fieldset>)}<button className="btn-primary" type="submit"><Send size={16} /> Submit answers</button></form>;
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
  return <form onSubmit={submit} className="panel space-y-4 p-6">{activity.content.leftItems.map((item, index) => <label key={item.id} className="grid items-center gap-3 md:grid-cols-2"><span className="font-semibold">{item.text}</span><select className="input-field" value={matches[index] ?? ""} onChange={(event) => setMatches(matches.map((value, position) => position === index ? Number(event.target.value) : value))} required><option value="">Select the matching concept</option>{activity.content.rightItems.map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}</select></label>)}<button className="btn-primary" type="submit"><Send size={16} /> Submit matches</button></form>;
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
  return <div className="space-y-3">{items.map((item, index) => <div key={item.id} className="panel flex items-center gap-3 p-4"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><span className="flex-1 text-sm font-semibold">{item.text}</span><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" className="rounded-md border border-border p-2 disabled:opacity-30" onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={15} /></button></div>)}<button type="button" className="btn-primary" onClick={submit}><Send size={16} /> Submit order</button></div>;
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
  return <form onSubmit={submit} className="panel space-y-5 p-6">{activity.content.sentences.map((sentence, index) => <label key={index} className="block"><span className="mb-2 block font-semibold">{index + 1}. {sentence.prompt}</span><input className="input-field" value={answers[index]} onChange={(event) => setAnswers(answers.map((value, position) => position === index ? event.target.value : value))} required /></label>)}<button className="btn-primary" type="submit"><Send size={16} /> Submit answers</button></form>;
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
