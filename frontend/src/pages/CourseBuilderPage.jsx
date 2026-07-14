import {
  Archive,
  BookOpen,
  ChevronDown,
  FileQuestion,
  FileText,
  ListChecks,
  Plus,
  Save,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DisabledButton from "../components/DisabledButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";

const activityIcons = {
  YOUTUBE_VIDEO: Video,
  READING: BookOpen,
  QUESTIONS: FileQuestion,
  INCORRECT_SECTION: ListChecks,
  ASSIGNMENT: FileText,
  FINAL_EXAM: Archive
};

export default function CourseBuilderPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [newBlock, setNewBlock] = useState("");
  const [topicInputs, setTopicInputs] = useState({});
  const [activityTopic, setActivityTopic] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api(`/courses/${id}`);
      setCourse(result.data);
      setMetadata({
        title: result.data.title,
        description: result.data.description,
        category: result.data.category,
        difficulty: result.data.difficulty,
        durationMinutes: result.data.durationMinutes,
        passingGrade: result.data.passingGrade,
        status: result.data.status,
        certificateEnabled: result.data.certificateEnabled
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveMetadata(event) {
    event.preventDefault();
    try {
      await api(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(metadata) });
      setMessage("Course settings saved.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addBlock(event) {
    event.preventDefault();
    await api("/blocks", {
      method: "POST",
      body: JSON.stringify({ courseId: id, title: newBlock })
    });
    setNewBlock("");
    load();
  }

  async function addTopic(event, blockId) {
    event.preventDefault();
    await api("/topics", {
      method: "POST",
      body: JSON.stringify({ blockId, title: topicInputs[blockId] })
    });
    setTopicInputs({ ...topicInputs, [blockId]: "" });
    load();
  }

  async function remove(path, label) {
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      await api(path, { method: "DELETE" });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!course || !metadata) {
    return <div className="container-page py-16 text-center text-text-secondary">{error || "Loading course builder..."}</div>;
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 lg:flex-row lg:items-end">
        <div>
          <Link to="/instructor" className="text-sm font-semibold text-primary">← Back to courses</Link>
          <div className="mt-3 flex items-center gap-3"><StatusBadge value={course.status} /><span className="text-xs text-text-secondary">Course ID: {course.id}</span></div>
          <h1 className="mt-3 font-display text-4xl font-bold">{course.title}</h1>
        </div>
        <div className="flex gap-3">
          <DisabledButton><Upload size={16} /> Import content</DisabledButton>
          <button form="course-settings" className="btn-primary" type="submit"><Save size={16} /> Save settings</button>
        </div>
      </div>
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      <form id="course-settings" onSubmit={saveMetadata} className="panel mt-7 grid gap-4 p-6 md:grid-cols-2">
        <Field label="Title" value={metadata.title} onChange={(value) => setMetadata({ ...metadata, title: value })} />
        <Field label="Category" value={metadata.category} onChange={(value) => setMetadata({ ...metadata, category: value })} />
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Description</span><textarea className="input-field min-h-28" value={metadata.description} onChange={(event) => setMetadata({ ...metadata, description: event.target.value })} /></label>
        <Select label="Difficulty" value={metadata.difficulty} options={["BEGINNER", "INTERMEDIATE", "ADVANCED"]} onChange={(value) => setMetadata({ ...metadata, difficulty: value })} />
        <Select label="Status" value={metadata.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(value) => setMetadata({ ...metadata, status: value })} />
        <Field label="Duration (minutes)" type="number" value={metadata.durationMinutes} onChange={(value) => setMetadata({ ...metadata, durationMinutes: Number(value) })} />
        <Field label="Passing grade (%)" type="number" value={metadata.passingGrade} onChange={(value) => setMetadata({ ...metadata, passingGrade: Number(value) })} />
        <label className="flex items-center gap-3 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={metadata.certificateEnabled} onChange={(event) => setMetadata({ ...metadata, certificateEnabled: event.target.checked })} className="accent-primary" /> Issue certificates after completion and passing grade</label>
      </form>

      <section className="mt-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow">Course structure</p><h2 className="mt-2 text-2xl font-bold">Blocks, topics, and activities</h2></div>
          <form onSubmit={addBlock} className="flex gap-2">
            <input className="input-field min-w-64" placeholder="New block title" value={newBlock} onChange={(event) => setNewBlock(event.target.value)} required />
            <button className="btn-primary" type="submit"><Plus size={16} /> Add block</button>
          </form>
        </div>

        {!course.blocks.length ? (
          <div className="mt-6"><EmptyState title="No course blocks" description="Add the first block. Students cannot enroll until the course contains at least one activity." /></div>
        ) : (
          <div className="mt-6 space-y-6">
            {course.blocks.map((block, blockIndex) => (
              <article key={block.id} className="panel overflow-hidden">
                <div className="flex items-center justify-between bg-primary px-6 py-4 text-inverse">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-inverse/70">Block {blockIndex + 1}</p><h3 className="mt-1 text-xl font-bold">{block.title}</h3></div>
                  <button type="button" onClick={() => remove(`/blocks/${block.id}`, `"${block.title}"`)} className="rounded-md p-2 hover:bg-inverse/10"><Trash2 size={18} /></button>
                </div>
                <div className="space-y-4 p-5">
                  {block.topics.map((topic, topicIndex) => (
                    <div key={topic.id} className="rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-3">
                        <div><p className="text-xs font-bold text-text-secondary">TOPIC {topicIndex + 1}</p><h4 className="font-bold">{topic.title}</h4></div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary px-3 py-2" onClick={() => setActivityTopic(activityTopic === topic.id ? null : topic.id)}><Plus size={15} /> Activity</button>
                          <button type="button" onClick={() => remove(`/topics/${topic.id}`, `"${topic.title}"`)} className="rounded-md border border-border p-2 text-text-secondary hover:text-error"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {topic.activities.map((activity, activityIndex) => {
                          const Icon = activityIcons[activity.type] ?? FileText;
                          return (
                            <div key={activity.id} className="flex items-center gap-4 px-5 py-4">
                              <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><Icon size={17} /></span>
                              <div className="flex-1"><p className="text-sm font-semibold">{activityIndex + 1}. {activity.title}</p><p className="mt-1 text-xs text-text-secondary">{activity.type.replaceAll("_", " ")} · {activity.points} points</p></div>
                              <button type="button" onClick={() => remove(`/activities/${activity.id}`, `"${activity.title}"`)} className="text-text-secondary hover:text-error"><Trash2 size={16} /></button>
                            </div>
                          );
                        })}
                        {!topic.activities.length && <p className="px-5 py-5 text-sm text-text-secondary">No activities. Add the first required step for this topic.</p>}
                      </div>
                      {activityTopic === topic.id && <ActivityForm topicId={topic.id} onCreated={() => { setActivityTopic(null); load(); }} onError={setError} />}
                    </div>
                  ))}
                  <form onSubmit={(event) => addTopic(event, block.id)} className="flex gap-2 rounded-md border border-dashed border-border p-3">
                    <input className="input-field" placeholder="New topic title" value={topicInputs[block.id] ?? ""} onChange={(event) => setTopicInputs({ ...topicInputs, [block.id]: event.target.value })} required />
                    <button className="btn-secondary shrink-0" type="submit"><Plus size={16} /> Add topic</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityForm({ topicId, onCreated, onError }) {
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    type: "READING",
    points: 0,
    minimumReadSeconds: 30,
    minimumWatchPercent: 80,
    maxAttempts: 1,
    videoUrl: "",
    videoDurationSeconds: 60,
    readingBody: "",
    questions: [{ prompt: "", options: ["", ""], correctIndex: 0, points: 1 }],
    sections: [{ text: "", incorrect: false }, { text: "", incorrect: true }],
    fields: [{ label: "", type: "textarea", required: true }]
  });

  async function submit(event) {
    event.preventDefault();
    let content;
    if (form.type === "YOUTUBE_VIDEO") content = { url: form.videoUrl, durationSeconds: Number(form.videoDurationSeconds) };
    if (form.type === "READING") content = { body: form.readingBody };
    if (["QUESTIONS", "FINAL_EXAM"].includes(form.type)) content = { questions: form.questions.map((question) => ({ ...question, points: Number(question.points), correctIndex: Number(question.correctIndex) })) };
    if (form.type === "INCORRECT_SECTION") content = { sections: form.sections };
    if (form.type === "ASSIGNMENT") content = { fields: form.fields };
    try {
      await api("/activities", {
        method: "POST",
        body: JSON.stringify({
          topicId,
          title: form.title,
          instructions: form.instructions || null,
          type: form.type,
          content,
          points: Number(form.points),
          minimumReadSeconds: Number(form.minimumReadSeconds),
          minimumWatchPercent: Number(form.minimumWatchPercent),
          maxAttempts: Number(form.maxAttempts) || null
        })
      });
      onCreated();
    } catch (requestError) {
      onError(requestError.message);
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-border bg-background p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Activity title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
        <Select label="Activity type" value={form.type} options={Object.keys(activityIcons)} onChange={(value) => setForm({ ...form, type: value })} />
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Instructions</span><textarea className="input-field" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label>
        {form.type === "YOUTUBE_VIDEO" && <>
          <Field label="YouTube URL" type="url" value={form.videoUrl} onChange={(value) => setForm({ ...form, videoUrl: value })} />
          <Field label="Video duration (seconds)" type="number" value={form.videoDurationSeconds} onChange={(value) => setForm({ ...form, videoDurationSeconds: Number(value) })} />
          <Field label="Minimum watch percentage" type="number" value={form.minimumWatchPercent} onChange={(value) => setForm({ ...form, minimumWatchPercent: Number(value) })} />
        </>}
        {form.type === "READING" && <>
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Reading content</span><textarea className="input-field min-h-40" value={form.readingBody} onChange={(event) => setForm({ ...form, readingBody: event.target.value })} required /></label>
          <Field label="Minimum reading time (seconds)" type="number" value={form.minimumReadSeconds} onChange={(value) => setForm({ ...form, minimumReadSeconds: Number(value) })} />
        </>}
        {["QUESTIONS", "FINAL_EXAM"].includes(form.type) && <QuestionBuilder questions={form.questions} onChange={(questions) => setForm({ ...form, questions })} />}
        {form.type === "INCORRECT_SECTION" && <SectionBuilder sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />}
        {form.type === "ASSIGNMENT" && <FieldBuilder fields={form.fields} onChange={(fields) => setForm({ ...form, fields })} />}
        {["QUESTIONS", "INCORRECT_SECTION", "ASSIGNMENT", "FINAL_EXAM"].includes(form.type) && <>
          <Field label="Points" type="number" value={form.points} onChange={(value) => setForm({ ...form, points: Number(value) })} />
          <Field label="Maximum attempts" type="number" value={form.maxAttempts} onChange={(value) => setForm({ ...form, maxAttempts: Number(value) })} />
        </>}
      </div>
      <button className="btn-primary mt-5" type="submit"><Plus size={16} /> Create activity</button>
    </form>
  );
}

function QuestionBuilder({ questions, onChange }) {
  function update(index, patch) { onChange(questions.map((question, position) => position === index ? { ...question, ...patch } : question)); }
  return (
    <div className="space-y-4 md:col-span-2">
      {questions.map((question, index) => (
        <div key={index} className="rounded-md border border-border bg-surface p-4">
          <Field label={`Question ${index + 1}`} value={question.prompt} onChange={(value) => update(index, { prompt: value })} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {question.options.map((option, optionIndex) => <Field key={optionIndex} label={`Option ${optionIndex + 1}`} value={option} onChange={(value) => update(index, { options: question.options.map((item, position) => position === optionIndex ? value : item) })} />)}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => update(index, { options: [...question.options, ""] })}>+ Add option</button>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select label="Correct option" value={String(question.correctIndex)} options={question.options.map((_, position) => String(position))} onChange={(value) => update(index, { correctIndex: Number(value) })} />
            <Field label="Points" type="number" value={question.points} onChange={(value) => update(index, { points: Number(value) })} />
          </div>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...questions, { prompt: "", options: ["", ""], correctIndex: 0, points: 1 }])}>+ Add question</button>
    </div>
  );
}

function SectionBuilder({ sections, onChange }) {
  return <div className="space-y-3 md:col-span-2">{sections.map((section, index) => <div key={index} className="flex items-center gap-3"><input className="input-field" value={section.text} onChange={(event) => onChange(sections.map((item, position) => position === index ? { ...item, text: event.target.value } : item))} placeholder={`Section ${index + 1}`} required /><label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={section.incorrect} onChange={(event) => onChange(sections.map((item, position) => position === index ? { ...item, incorrect: event.target.checked } : item))} className="accent-primary" /> Incorrect</label></div>)}<button type="button" className="btn-secondary" onClick={() => onChange([...sections, { text: "", incorrect: false }])}>+ Add section</button></div>;
}

function FieldBuilder({ fields, onChange }) {
  return <div className="space-y-3 md:col-span-2">{fields.map((field, index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input className="input-field" value={field.label} onChange={(event) => onChange(fields.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} placeholder="Field label" required /><select className="input-field" value={field.type} onChange={(event) => onChange(fields.map((item, position) => position === index ? { ...item, type: event.target.value } : item))}><option value="text">Short text</option><option value="textarea">Long text</option><option value="number">Number</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => onChange(fields.map((item, position) => position === index ? { ...item, required: event.target.checked } : item))} className="accent-primary" /> Required</label></div>)}<button type="button" className="btn-secondary" onClick={() => onChange([...fields, { label: "", type: "textarea", required: true }])}>+ Add form field</button></div>;
}

function Field({ label, value, onChange, type = "text" }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function Select({ label, value, options, onChange }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><span className="relative block"><select className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>;
}

