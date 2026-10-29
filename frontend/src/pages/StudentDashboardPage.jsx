import Pagination from "../components/Pagination.jsx";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BookOpen, Clock3, Play, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";
import { difficultyLabel } from "../lib/labels.js";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0 });
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseResult, enrollmentResult] = await Promise.all([
        api(`/courses/catalog?page=${page}&limit=12&search=${encodeURIComponent(search)}`),
        api("/enrollments?mine=true")
      ]);
      setCourses(courseResult.data);
      setMeta(courseResult.meta);
      setEnrollments(enrollmentResult.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [load]);

  async function enroll(courseId) {
    try {
      await api("/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId })
      });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const enrollmentByCourse = new Map(enrollments.map((item) => [item.courseId, item]));

  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="Espacio de aprendizaje"
        title="Mi aprendizaje"
        description="Aquí aparecen los cursos publicados para tu rol, organización o cuenta. Las actividades se habilitan en el orden definido por el instructor."
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Cursos activos</h2>
        {enrollments.length ? (
          <div className="mt-5 course-grid">
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className="panel course-card p-6">
                <StatusBadge value={enrollment.status} />
                <h3 className="mt-4 text-xl font-bold">{enrollment.course.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{enrollment.course.category} · {difficultyLabel(enrollment.course.difficulty)}</p>
                <div className="mt-5">
                  <ProgressBar value={enrollment.courseProgress?.completionPercent ?? 0} label="Progreso del curso" />
                </div>
                <Link to={`/courses/${enrollment.courseId}/class`} className="btn-primary mt-5 w-full"><Play size={16} /> Continuar curso</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="No tienes inscripciones" description="Inscríbete en uno de los cursos publicados disponibles abajo." /></div>
        )}
      </section>

      <input className="input-field mt-5 sm:max-w-md" type="search" aria-label="Buscar cursos del catálogo" placeholder="Buscar cursos disponibles" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Cursos disponibles</h2>
        {loading ? <p role="status" className="py-4 text-text-secondary">Cargando catálogo...</p> : courses.length ? (
          <div className="mt-5 course-grid">
            {courses.map((course) => {
              const enrollment = enrollmentByCourse.get(course.id);
              return (
                <article key={course.id} className="panel course-card p-6">
                  <div className="flex items-center justify-between"><StatusBadge value={course.status} /><span className="flex items-center gap-1 text-xs text-text-secondary"><Clock3 size={14} /> {course.durationMinutes} min</span></div>
                  <h3 className="mt-4 text-xl font-bold">{course.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{course.description}</p>
                  <p className="mt-4 text-xs text-text-secondary">{course._count.blocks} bloques · Calificación mínima {course.passingGrade}%</p>
                  {enrollment ? (
                    <Link to={`/courses/${course.id}/class`} className="btn-secondary mt-5 w-full"><BookOpen size={16} /> Abrir curso</Link>
                  ) : (
                    <button type="button" className="btn-primary mt-5 w-full" disabled={!can(user, "learning.enroll")} onClick={() => enroll(course.id)}><Plus size={16} /> Inscribirme</button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="No hay cursos publicados" description="Un instructor o administrador debe crear y publicar un curso primero." /></div>
        )}
        <Pagination meta={meta} onChange={setPage} />
      </section>
    </div>
  );
}
