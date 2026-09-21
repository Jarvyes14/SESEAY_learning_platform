import { BookOpen, Plus, Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DisabledButton from "../components/DisabledButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";

const initialCourse = {
  title: "",
  description: "",
  category: "",
  difficulty: "BEGINNER",
  durationMinutes: 60,
  passingGrade: 70,
  status: "DRAFT",
  certificateEnabled: false
};

export default function InstructorDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(initialCourse);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api("/courses?limit=100")
      .then((result) => setCourses(result.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCourse(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/courses", { method: "POST", body: JSON.stringify(form) });
      setForm(initialCourse);
      setShowForm(false);
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete "${course.title}"?`)) return;
    try {
      await api(`/courses/${course.id}`, { method: "DELETE" });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="Instructor workspace"
        title="Course management"
        description="Create courses and build the exact block, topic, and activity sequence students must complete."
        actions={
          <>
            <DisabledButton>Duplicate course</DisabledButton>
            <button type="button" className="btn-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> New course</button>
          </>
        }
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      {showForm && (
        <form onSubmit={createCourse} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <Field label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Description</span>
            <textarea className="input-field min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>
          <label><span className="mb-2 block text-sm font-semibold">Difficulty</span><select className="input-field" value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select></label>
          <Field label="Duration in minutes" type="number" value={form.durationMinutes} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} />
          <Field label="Passing grade" type="number" value={form.passingGrade} onChange={(value) => setForm({ ...form, passingGrade: Number(value) })} />
          <label className="flex items-center gap-3 pt-7 text-sm font-semibold"><input type="checkbox" checked={form.certificateEnabled} onChange={(event) => setForm({ ...form, certificateEnabled: event.target.checked })} className="accent-primary" /> Enable certificate</label>
          <button className="btn-primary md:col-span-2" type="submit"><BookOpen size={16} /> Create draft course</button>
        </form>
      )}
      <section className="mt-8">
        {courses.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <article key={course.id} className="panel p-6">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge value={course.status} />
                  <button type="button" className="text-text-secondary hover:text-error" onClick={() => deleteCourse(course)}><Trash2 size={17} /></button>
                </div>
                <h2 className="mt-4 text-xl font-bold">{course.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{course.description}</p>
                <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-xs text-text-secondary">
                  Access: {course.accessType === "ROLE"
                    ? `Role · ${course.accessRole?.displayName ?? "Not configured"}`
                    : course.accessType === "ORGANIZATION"
                      ? `Organization · ${course.accessOrganization?.name ?? "Not configured"}`
                      : `${course._count.accessUsers} selected users`}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-text-secondary">
                  <div><dt>Blocks</dt><dd className="mt-1 font-bold text-text-primary">{course._count.blocks}</dd></div>
                  <div><dt>Enrollments</dt><dd className="mt-1 font-bold text-text-primary">{course._count.enrollments}</dd></div>
                </dl>
                <Link to={`/courses/${course.id}/builder`} className="btn-primary mt-5 w-full"><Wrench size={16} /> Open course builder</Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No courses yet" description="Create the first real course. The database currently contains no sample catalog." action={<button type="button" className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create course</button>} />
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}
