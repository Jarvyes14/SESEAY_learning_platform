import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileQuestion,
  FileText,
  LayoutPanelTop,
  Link2,
  ListChecks,
  ListOrdered,
  Network,
  PanelsTopLeft,
  Plus,
  Save,
  Scale,
  TextCursorInput,
  Trash2,
  ToggleLeft,
  Upload,
  Video
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DisabledButton from "../components/DisabledButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";

const activityIcons = {
  YOUTUBE_VIDEO: Video,
  READING: BookOpen,
  EXTERNAL_LINK: Link2,
  EMBEDDED_CONTENT: PanelsTopLeft,
  CASE_STUDY: Scale,
  TRUE_FALSE: ToggleLeft,
  MATCHING: Network,
  ORDERING: ListOrdered,
  FILL_BLANKS: TextCursorInput,
  INTERACTIVE_CONTENT: LayoutPanelTop,
  QUESTIONS: FileQuestion,
  INCORRECT_SECTION: ListChecks,
  ASSIGNMENT: FileText,
  FINAL_EXAM: Archive
};

export default function CourseBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [audienceOptions, setAudienceOptions] = useState({ roles: [], organizations: [], users: [] });
  const [newBlock, setNewBlock] = useState("");
  const [topicInputs, setTopicInputs] = useState({});
  const [activityTopic, setActivityTopic] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const [result, optionsResult] = await Promise.all([
        api(`/courses/${id}`),
        api("/courses/audience-options")
      ]);
      setCourse(result.data);
      setAudienceOptions(optionsResult.data);
      setMetadata({
        title: result.data.title,
        description: result.data.description,
        category: result.data.category,
        difficulty: result.data.difficulty,
        durationMinutes: result.data.durationMinutes,
        passingGrade: result.data.passingGrade,
        status: result.data.status,
        certificateEnabled: result.data.certificateEnabled,
        accessType: result.data.accessType,
        accessRoleId: result.data.accessRoleId ?? "",
        accessOrganizationId: result.data.accessOrganizationId ?? "",
        accessUserIds: result.data.accessUsers.map((entry) => entry.user.id)
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveMetadata(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...metadata,
        accessRoleId: metadata.accessType === "ROLE" ? metadata.accessRoleId : null,
        accessOrganizationId:
          metadata.accessType === "ORGANIZATION" ? metadata.accessOrganizationId : null,
        accessUserIds: metadata.accessType === "USERS" ? metadata.accessUserIds : []
      };
      await api(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setSaveSuccess(true);
      window.setTimeout(() => navigate("/instructor", { replace: true }), 1400);
    } catch (requestError) {
      const fieldErrors = requestError.details?.fieldErrors;
      const detail = fieldErrors
        ? Object.values(fieldErrors).flat().join(". ")
        : "";
      setError(detail ? `${requestError.message}: ${detail}` : requestError.message);
      setSaving(false);
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
          <button form="course-settings" className="btn-primary" type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save settings"}</button>
        </div>
      </div>
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      {saveSuccess && (
        <div className="fixed right-6 top-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-success bg-surface p-4 text-success shadow-panel" role="status" aria-live="polite">
          <CheckCircle2 className="mt-0.5 shrink-0" size={21} />
          <div>
            <p className="font-bold">Saved successfully</p>
          </div>
        </div>
      )}

      <form id="course-settings" onSubmit={saveMetadata} className="panel mt-7 grid gap-4 p-6 md:grid-cols-2">
        <Field label="Title" value={metadata.title} onChange={(value) => setMetadata({ ...metadata, title: value })} />
        <Field label="Category" value={metadata.category} onChange={(value) => setMetadata({ ...metadata, category: value })} />
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Description</span><textarea className="input-field min-h-28" value={metadata.description} onChange={(event) => setMetadata({ ...metadata, description: event.target.value })} /></label>
        <Select label="Difficulty" value={metadata.difficulty} options={["BEGINNER", "INTERMEDIATE", "ADVANCED"]} onChange={(value) => setMetadata({ ...metadata, difficulty: value })} />
        <Select label="Status" value={metadata.status} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} onChange={(value) => setMetadata({ ...metadata, status: value })} />
        <Field label="Duration (minutes)" type="number" value={metadata.durationMinutes} onChange={(value) => setMetadata({ ...metadata, durationMinutes: Number(value) })} />
        <Field label="Passing grade (%)" type="number" value={metadata.passingGrade} onChange={(value) => setMetadata({ ...metadata, passingGrade: Number(value) })} />
        <label className="flex items-center gap-3 text-sm font-semibold md:col-span-2"><input type="checkbox" checked={metadata.certificateEnabled} onChange={(event) => setMetadata({ ...metadata, certificateEnabled: event.target.checked })} className="accent-primary" /> Issue certificates after completion and passing grade</label>
        <div className="border-t border-border pt-5 md:col-span-2">
          <p className="eyebrow">Course access</p>
          <h2 className="mt-2 text-xl font-bold">Who can find and enroll in this course?</h2>
          <p className="mt-1 text-sm text-text-secondary">Choose exactly one audience rule. It takes effect when the course is published.</p>
        </div>
        <Select
          label="Access type"
          value={metadata.accessType}
          options={["ROLE", "ORGANIZATION", "USERS"]}
          onChange={(value) => setMetadata({ ...metadata, accessType: value })}
        />
        {metadata.accessType === "ROLE" && (
          <OptionSelect
            label="Role with access"
            value={metadata.accessRoleId}
            options={audienceOptions.roles.map((role) => ({ value: role.id, label: role.displayName }))}
            onChange={(value) => setMetadata({ ...metadata, accessRoleId: value })}
          />
        )}
        {metadata.accessType === "ORGANIZATION" && (
          <OptionSelect
            label="Organization with access"
            value={metadata.accessOrganizationId}
            options={audienceOptions.organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
            onChange={(value) => setMetadata({ ...metadata, accessOrganizationId: value })}
          />
        )}
        {metadata.accessType === "USERS" && (
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Users with access</span>
            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-border bg-surface-muted p-3 md:grid-cols-2">
              {audienceOptions.users.map((user) => (
                <label key={user.id} className="flex items-start gap-3 rounded-md bg-surface p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={metadata.accessUserIds.includes(user.id)}
                    onChange={(event) => setMetadata({
                      ...metadata,
                      accessUserIds: event.target.checked
                        ? [...metadata.accessUserIds, user.id]
                        : metadata.accessUserIds.filter((id) => id !== user.id)
                    })}
                  />
                  <span><strong className="block">{user.firstName} {user.lastName}</strong><span className="text-xs text-text-secondary">{user.email} · {user.role.displayName}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>

      <section className="mt-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow">Course structure</p><h2 className="mt-2 text-2xl font-bold">Blocks, lessons, and activities</h2></div>
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
                        <div><p className="text-xs font-bold text-text-secondary">LESSON {topicIndex + 1}</p><h4 className="font-bold">{topic.title}</h4></div>
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
                    <input className="input-field" placeholder="New lesson title" value={topicInputs[block.id] ?? ""} onChange={(event) => setTopicInputs({ ...topicInputs, [block.id]: event.target.value })} required />
                    <button className="btn-secondary shrink-0" type="submit"><Plus size={16} /> Add lesson</button>
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
    externalUrl: "",
    externalLabel: "Open resource",
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
  });

  async function submit(event) {
    event.preventDefault();
    let content;
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
        {form.type === "EXTERNAL_LINK" && <>
          <Field label="Resource URL" type="url" value={form.externalUrl} onChange={(value) => setForm({ ...form, externalUrl: value })} />
          <Field label="Link label" value={form.externalLabel} onChange={(value) => setForm({ ...form, externalLabel: value })} />
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Resource description</span><textarea className="input-field" value={form.externalDescription} onChange={(event) => setForm({ ...form, externalDescription: event.target.value })} /></label>
        </>}
        {form.type === "EMBEDDED_CONTENT" && <>
          <Field label="Embed URL" type="url" value={form.embedUrl} onChange={(value) => setForm({ ...form, embedUrl: value })} />
          <Field label="Embedded content title" value={form.embedTitle} onChange={(value) => setForm({ ...form, embedTitle: value })} />
          <Field label="Frame height (pixels)" type="number" value={form.embedHeight} onChange={(value) => setForm({ ...form, embedHeight: Number(value) })} />
        </>}
        {form.type === "CASE_STUDY" && <>
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold">Scenario and context</span><textarea className="input-field min-h-40" value={form.scenario} onChange={(event) => setForm({ ...form, scenario: event.target.value })} required /></label>
          <QuestionBuilder questions={form.questions} onChange={(questions) => setForm({ ...form, questions })} />
        </>}
        {["QUESTIONS", "FINAL_EXAM"].includes(form.type) && <QuestionBuilder questions={form.questions} onChange={(questions) => setForm({ ...form, questions })} />}
        {form.type === "TRUE_FALSE" && <TrueFalseBuilder statements={form.statements} onChange={(statements) => setForm({ ...form, statements })} />}
        {form.type === "MATCHING" && <MatchingBuilder pairs={form.pairs} onChange={(pairs) => setForm({ ...form, pairs })} />}
        {form.type === "ORDERING" && <SimpleListBuilder title="Correct sequence" items={form.orderingItems} onChange={(orderingItems) => setForm({ ...form, orderingItems })} />}
        {form.type === "FILL_BLANKS" && <FillBlankBuilder sentences={form.sentences} onChange={(sentences) => setForm({ ...form, sentences })} />}
        {form.type === "INTERACTIVE_CONTENT" && <InteractiveBuilder layout={form.interactiveLayout} items={form.interactiveItems} onLayoutChange={(interactiveLayout) => setForm({ ...form, interactiveLayout })} onChange={(interactiveItems) => setForm({ ...form, interactiveItems })} />}
        {form.type === "INCORRECT_SECTION" && <SectionBuilder sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />}
        {form.type === "ASSIGNMENT" && <FieldBuilder fields={form.fields} onChange={(fields) => setForm({ ...form, fields })} />}
        {["QUESTIONS", "INCORRECT_SECTION", "ASSIGNMENT", "FINAL_EXAM", "CASE_STUDY", "TRUE_FALSE", "MATCHING", "ORDERING", "FILL_BLANKS"].includes(form.type) && <>
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

function TrueFalseBuilder({ statements, onChange }) {
  function update(index, patch) {
    onChange(statements.map((statement, position) => position === index ? { ...statement, ...patch } : statement));
  }
  return (
    <div className="space-y-3 md:col-span-2">
      {statements.map((statement, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-[1fr_180px_120px]">
          <Field label={`Statement ${index + 1}`} value={statement.prompt} onChange={(value) => update(index, { prompt: value })} />
          <Select label="Correct answer" value={statement.correctAnswer ? "TRUE" : "FALSE"} options={["TRUE", "FALSE"]} onChange={(value) => update(index, { correctAnswer: value === "TRUE" })} />
          <Field label="Points" type="number" value={statement.points} onChange={(value) => update(index, { points: Number(value) })} />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...statements, { prompt: "", correctAnswer: true, points: 1 }])}>+ Add statement</button>
    </div>
  );
}

function MatchingBuilder({ pairs, onChange }) {
  function update(index, field, value) {
    onChange(pairs.map((pair, position) => position === index ? { ...pair, [field]: value } : pair));
  }
  return (
    <div className="space-y-3 md:col-span-2">
      <p className="text-sm text-text-secondary">Enter each concept beside its correct match.</p>
      {pairs.map((pair, index) => (
        <div key={index} className="grid gap-3 md:grid-cols-2">
          <Field label={`Concept ${index + 1}`} value={pair.left} onChange={(value) => update(index, "left", value)} />
          <Field label="Correct match" value={pair.right} onChange={(value) => update(index, "right", value)} />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...pairs, { left: "", right: "" }])}>+ Add pair</button>
    </div>
  );
}

function SimpleListBuilder({ title, items, onChange }) {
  return (
    <div className="space-y-3 md:col-span-2">
      <p className="text-sm font-semibold">{title}</p>
      {items.map((item, index) => (
        <Field key={index} label={`Position ${index + 1}`} value={item} onChange={(value) => onChange(items.map((entry, position) => position === index ? value : entry))} />
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...items, ""])}>+ Add item</button>
    </div>
  );
}

function FillBlankBuilder({ sentences, onChange }) {
  function update(index, patch) {
    onChange(sentences.map((sentence, position) => position === index ? { ...sentence, ...patch } : sentence));
  }
  return (
    <div className="space-y-4 md:col-span-2">
      {sentences.map((sentence, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-2">
          <Field label={`Prompt ${index + 1}`} value={sentence.prompt} onChange={(value) => update(index, { prompt: value })} />
          <Field label="Expected answer" value={sentence.answer} onChange={(value) => update(index, { answer: value })} />
          <Field label="Points" type="number" value={sentence.points} onChange={(value) => update(index, { points: Number(value) })} />
          <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={sentence.caseSensitive} onChange={(event) => update(index, { caseSensitive: event.target.checked })} className="accent-primary" /> Case-sensitive answer</label>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...sentences, { prompt: "", answer: "", caseSensitive: false, points: 1 }])}>+ Add blank</button>
    </div>
  );
}

function InteractiveBuilder({ layout, items, onLayoutChange, onChange }) {
  function update(index, patch) {
    onChange(items.map((item, position) => position === index ? { ...item, ...patch } : item));
  }
  return (
    <div className="space-y-4 md:col-span-2">
      <Select label="Presentation" value={layout} options={["ACCORDION", "TABS", "CARDS"]} onChange={onLayoutChange} />
      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-border bg-surface p-4">
          <Field label={`Item ${index + 1} title`} value={item.title} onChange={(value) => update(index, { title: value })} />
          <label className="mt-3 block"><span className="mb-2 block text-sm font-semibold">Content</span><textarea className="input-field min-h-24" value={item.body} onChange={(event) => update(index, { body: event.target.value })} required /></label>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...items, { title: "", body: "" }])}>+ Add interactive item</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function Select({ label, value, options, onChange }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><span className="relative block"><select className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" /></span></label>;
}

function OptionSelect({ label, value, options, onChange }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <span className="relative block">
        <select className="input-field appearance-none" value={value} onChange={(event) => onChange(event.target.value)} required>
          <option value="">Select an option</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-text-secondary" />
      </span>
    </label>
  );
}
