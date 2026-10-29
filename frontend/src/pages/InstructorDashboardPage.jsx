import Pagination from "../components/Pagination.jsx";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Award, BookOpen, Plus, Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";
import { roleLabel } from "../lib/labels.js";

const initialCourse = {
  title: "",
  description: "",
  category: "",
  difficulty: "BEGINNER",
  durationMinutes: 60,
  passingGrade: 70,
  status: "DRAFT",
  certificateEnabled: false,
  certificateTemplateId: ""
};

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const canViewTemplates = can(user, "certificate_templates.view");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0 });
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [form, setForm] = useState(initialCourse);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    return api(`/courses?page=${page}&limit=12&search=${encodeURIComponent(search)}`)
      .then((result) => { setCourses(result.data); setMeta(result.meta); if (page > 1 && !result.data.length) setPage(page - 1); })
      .catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (canViewTemplates) api("/certificates/templates")
      .then((result) => setCertificateTemplates(result.data))
      .catch((requestError) => setError(requestError.message));
  }, [canViewTemplates]);

  async function createCourse(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/courses", { method: "POST", body: JSON.stringify({ ...form, certificateTemplateId: form.certificateTemplateId || null, certificateEnabled: Boolean(form.certificateTemplateId) }) });
      setForm(initialCourse);
      setShowForm(false);
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`¿Eliminar “${course.title}”?`)) return;
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
        eyebrow="Espacio del instructor"
        title="Administración de cursos"
        description="Crea cursos y define la secuencia exacta de bloques, lecciones y actividades que completarán los participantes."
        actions={
          <>

            <button type="button" className="btn-primary" disabled={!can(user, "courses.create")} onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Nuevo curso</button>
          </>
        }
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      {showForm && (
        <form onSubmit={createCourse} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <Field label="Título" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="Categoría" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Descripción</span>
            <textarea className="input-field min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>
          <label><span className="mb-2 block text-sm font-semibold">Dificultad</span><select className="input-field" value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}><option value="BEGINNER">Principiante</option><option value="INTERMEDIATE">Intermedio</option><option value="ADVANCED">Avanzado</option></select></label>
          <Field label="Duración en minutos" type="number" value={form.durationMinutes} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} />
          <Field label="Calificación mínima" type="number" value={form.passingGrade} onChange={(value) => setForm({ ...form, passingGrade: Number(value) })} />
          <label><span className="mb-2 block text-sm font-semibold">Certificado del curso</span><select className="input-field" value={form.certificateTemplateId} onChange={(event) => setForm({ ...form, certificateTemplateId: event.target.value, certificateEnabled: Boolean(event.target.value) })}><option value="">Sin certificado</option>{certificateTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
          <button className="btn-primary md:col-span-2" type="submit"><BookOpen size={16} /> Crear curso como borrador</button>
        </form>
      )}
      <input className="input-field mt-5 sm:max-w-md" type="search" aria-label="Buscar cursos" placeholder="Buscar cursos por título o categoría" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <section className="mt-5">{loading && <p role="status" className="py-4 text-text-secondary">Cargando cursos...</p>}
        {loading ? null : courses.length ? (
          <div className="course-grid">
            {courses.map((course) => (
              <article key={course.id} className="panel course-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge value={course.status} />
                  <button type="button" className="text-text-secondary hover:text-error" disabled={!can(user, "courses.delete")} onClick={() => deleteCourse(course)}><Trash2 size={17} /></button>
                </div>
                <h2 className="mt-4 text-xl font-bold">{course.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{course.description}</p>
                <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-xs text-text-secondary">
                  Acceso: {course.accessType === "ROLE"
                    ? `Rol · ${course.accessRole?.displayName ?? (roleLabel(course.accessRole?.name) || "Sin configurar")}`
                    : course.accessType === "ORGANIZATION"
                      ? `Organización · ${course.accessOrganization?.name ?? "Sin configurar"}`
                      : `${course._count.accessUsers} personas seleccionadas`}
                </p>
                <p className={`mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${course.certificateTemplateId ? "bg-success/10 text-success" : "bg-surface-muted text-text-secondary"}`}><Award size={14} />{course.certificateTemplateId ? `Certificado: ${certificateTemplates.find((template) => template.id === course.certificateTemplateId)?.name ?? "Plantilla asignada"}` : "Sin certificado"}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-text-secondary">
                  <div><dt>Bloques</dt><dd className="mt-1 font-bold text-text-primary">{course._count.blocks}</dd></div>
                  <div><dt>Inscripciones</dt><dd className="mt-1 font-bold text-text-primary">{course._count.enrollments}</dd></div>
                </dl>
                <Link to={`/courses/${course.id}/builder`} className="btn-primary mt-5 w-full"><Wrench size={16} /> Abrir constructor</Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Aún no hay cursos" description="Crea el primer curso para comenzar a construir el catálogo." action={<button type="button" className="btn-primary" disabled={!can(user, "courses.create")} onClick={() => setShowForm(true)}><Plus size={16} /> Crear curso</button>} />
        )}
        <Pagination meta={meta} onChange={setPage} />
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}
