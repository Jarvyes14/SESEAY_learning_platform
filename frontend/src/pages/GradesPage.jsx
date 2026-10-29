import { can } from "../lib/permissions.js";
import { BookOpen, CheckCircle2, ChevronDown, GraduationCap, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : null;
}

function enrollmentGrade(enrollment) {
  if (Number.isFinite(enrollment.courseProgress?.finalGrade)) return enrollment.courseProgress.finalGrade;
  return average(enrollment.grades.filter((grade) => !grade.isFinal).map((grade) => grade.percentage));
}

function formatGrade(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "Sin calificación";
}

function studentName(student) {
  return `${student.firstName} ${student.lastName}`;
}

export default function GradesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [pending, setPending] = useState([]);
  const [review, setReview] = useState({});
  const [view, setView] = useState("course");
  const [courseFilter, setCourseFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canReview = can(user, "grades.review");
  const canBrowseStudents = user.permissionScope !== "OWN" || can(user, "enrollments.view") || canReview;

  const load = useCallback(async () => {
    try {
      const overviewResult = await api("/grades/overview");
      setEnrollments(overviewResult.data);
      if (canReview) {
        const pendingResult = await api("/grades/pending");
        setPending(pendingResult.data);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [canReview]);

  useEffect(() => { load(); }, [load]);

  const courses = useMemo(() => {
    const groups = new Map();
    for (const enrollment of enrollments) {
      const group = groups.get(enrollment.course.id) ?? { course: enrollment.course, enrollments: [] };
      group.enrollments.push(enrollment);
      groups.set(enrollment.course.id, group);
    }
    return [...groups.values()].sort((a, b) => a.course.title.localeCompare(b.course.title, "es"));
  }, [enrollments]);

  const students = useMemo(() => {
    const groups = new Map();
    for (const enrollment of enrollments) {
      const group = groups.get(enrollment.student.id) ?? { student: enrollment.student, enrollments: [] };
      group.enrollments.push(enrollment);
      groups.set(enrollment.student.id, group);
    }
    return [...groups.values()].sort((a, b) => studentName(a.student).localeCompare(studentName(b.student), "es"));
  }, [enrollments]);

  const visibleCourses = courses.filter((group) => {
    const matchesSelection = !courseFilter || group.course.id === courseFilter;
    const term = search.trim().toLocaleLowerCase("es");
    const matchesSearch = !term || group.course.title.toLocaleLowerCase("es").includes(term) || group.enrollments.some((item) => `${studentName(item.student)} ${item.student.email}`.toLocaleLowerCase("es").includes(term));
    return matchesSelection && matchesSearch;
  });

  const visibleStudents = students.filter((group) => {
    const matchesSelection = !studentFilter || group.student.id === studentFilter;
    const term = search.trim().toLocaleLowerCase("es");
    const matchesSearch = !term || `${studentName(group.student)} ${group.student.email}`.toLocaleLowerCase("es").includes(term) || group.enrollments.some((item) => item.course.title.toLocaleLowerCase("es").includes(term));
    return matchesSelection && matchesSearch;
  });

  function changeView(nextView) {
    setView(nextView);
    setExpanded("");
    setSearch("");
  }

  async function submitReview(attempt) {
    const values = review[attempt.id] ?? {};
    try {
      await api(`/grades/attempts/${attempt.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ score: Number(values.score), feedback: values.feedback })
      });
      load();
    } catch (requestError) { setError(requestError.message); }
  }

  if (loading) return <div className="container-page py-10" role="status">Cargando calificaciones...</div>;

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Evaluación" title="Calificaciones" description="Consulta el desempeño por curso o por participante y abre cada fila para ver el detalle completo." />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Explorador de calificaciones</h2>
            <p className="mt-1 text-sm text-text-secondary">Incluye todas las inscripciones, incluso cuando todavía no existe una calificación.</p>
          </div>
          {canBrowseStudents && (
            <div className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-surface p-1" aria-label="Agrupar calificaciones">
              <button type="button" onClick={() => changeView("course")} className={`rounded-md px-4 py-2 text-sm font-semibold ${view === "course" ? "bg-primary text-inverse" : "text-text-secondary hover:bg-surface-muted"}`}><BookOpen size={15} className="mr-2 inline" />Por curso</button>
              <button type="button" onClick={() => changeView("student")} className={`rounded-md px-4 py-2 text-sm font-semibold ${view === "student" ? "bg-primary text-inverse" : "text-text-secondary hover:bg-surface-muted"}`}><Users size={15} className="mr-2 inline" />Por participante</button>
            </div>
          )}
        </div>

        <div className="panel mt-5 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
          <label className="relative block"><span className="sr-only">Buscar</span><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-text-secondary" /><input className="input-field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "course" ? "Buscar curso o participante…" : "Buscar participante o curso…"} /></label>
          {view === "course" ? (
            <label><span className="sr-only">Filtrar por curso</span><select className="input-field" value={courseFilter} onChange={(event) => { setCourseFilter(event.target.value); setExpanded(""); }}><option value="">Todos los cursos</option>{courses.map((group) => <option key={group.course.id} value={group.course.id}>{group.course.title}</option>)}</select></label>
          ) : (
            <label><span className="sr-only">Filtrar por participante</span><select className="input-field" value={studentFilter} onChange={(event) => { setStudentFilter(event.target.value); setExpanded(""); }}><option value="">Todos los participantes</option>{students.map((group) => <option key={group.student.id} value={group.student.id}>{studentName(group.student)}</option>)}</select></label>
          )}
        </div>

        {view === "course" ? <CourseTable groups={visibleCourses} expanded={expanded} setExpanded={setExpanded} /> : <StudentTable groups={visibleStudents} expanded={expanded} setExpanded={setExpanded} />}
      </section>

      {canReview && (
        <section className="mt-12 border-t border-border pt-9">
          <h2 className="text-2xl font-bold">Tareas pendientes de revisión ({pending.length})</h2>
          {pending.length ? <div className="mt-5 space-y-5">{pending.map((attempt) => {
            const maxScore = attempt.activity.points || 100;
            return <article key={attempt.id} className="panel p-6"><div className="flex flex-wrap justify-between gap-4"><div><StatusBadge value={attempt.status} /><h3 className="mt-3 text-xl font-bold">{attempt.activity.title}</h3><p className="mt-1 text-sm text-text-secondary">{attempt.student.firstName} {attempt.student.lastName} · {attempt.activity.topic.block.course.title}</p></div><GraduationCap className="text-primary" /></div><pre className="mt-5 overflow-auto rounded-md bg-surface-muted p-4 text-xs">{JSON.stringify(attempt.response, null, 2)}</pre><div className="mt-5 grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_auto]"><label><span className="mb-2 block text-sm font-semibold">Calificación / {maxScore}</span><input className="input-field" type="number" min="0" max={maxScore} value={review[attempt.id]?.score ?? ""} onChange={(event) => setReview({ ...review, [attempt.id]: { ...review[attempt.id], score: event.target.value } })} /></label><label><span className="mb-2 block text-sm font-semibold">Comentarios</span><input className="input-field" value={review[attempt.id]?.feedback ?? ""} onChange={(event) => setReview({ ...review, [attempt.id]: { ...review[attempt.id], feedback: event.target.value } })} /></label><button type="button" className="btn-primary self-end" disabled={review[attempt.id]?.score === undefined} onClick={() => submitReview(attempt)}><CheckCircle2 size={16} /> Calificar</button></div></article>;
          })}</div> : <div className="mt-5"><EmptyState title="No hay revisiones pendientes" description="Aquí aparecerán las tareas enviadas que estén esperando calificación." /></div>}
        </section>
      )}
    </div>
  );
}

function CourseTable({ groups, expanded, setExpanded }) {
  if (!groups.length) return <div className="mt-5"><EmptyState title="No se encontraron cursos" description="Modifica los filtros o espera a que existan inscripciones." /></div>;
  return <div className="table-scroll mt-5 rounded-lg border border-border bg-surface" tabIndex={0} role="region" aria-label="Tabla de calificaciones"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-text-secondary"><tr><th className="px-5 py-4">Curso</th><th className="px-5 py-4">Participantes</th><th className="px-5 py-4">Promedio</th><th className="px-5 py-4">Completaron</th><th className="w-14 px-5 py-4" /></tr></thead><tbody className="divide-y divide-border">{groups.map((group) => {
    const isOpen = expanded === group.course.id;
    const grades = group.enrollments.map(enrollmentGrade);
    const completed = group.enrollments.filter((item) => item.courseProgress?.completedAt).length;
    return [<tr key={group.course.id} tabIndex="0" role="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? "" : group.course.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpanded(isOpen ? "" : group.course.id); }} className="cursor-pointer transition hover:bg-primary/5"><td className="px-5 py-4 font-bold">{group.course.title}</td><td className="px-5 py-4">{group.enrollments.length}</td><td className="px-5 py-4 font-bold">{formatGrade(average(grades))}</td><td className="px-5 py-4">{completed} de {group.enrollments.length}</td><td className="px-5 py-4"><ChevronDown size={18} className={`transition ${isOpen ? "rotate-180 text-primary" : "text-text-secondary"}`} /></td></tr>, isOpen && <tr key={`${group.course.id}-detail`}><td colSpan="5" className="bg-background p-5"><EnrollmentDetails enrollments={group.enrollments} perspective="course" /></td></tr>];
  })}</tbody></table></div>;
}

function StudentTable({ groups, expanded, setExpanded }) {
  if (!groups.length) return <div className="mt-5"><EmptyState title="No se encontraron participantes" description="Modifica los filtros o espera a que existan inscripciones." /></div>;
  return <div className="table-scroll mt-5 rounded-lg border border-border bg-surface" tabIndex={0} role="region" aria-label="Tabla de calificaciones"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-text-secondary"><tr><th className="px-5 py-4">Participante</th><th className="px-5 py-4">Cursos</th><th className="px-5 py-4">Promedio</th><th className="px-5 py-4">Completados</th><th className="w-14 px-5 py-4" /></tr></thead><tbody className="divide-y divide-border">{groups.map((group) => {
    const isOpen = expanded === group.student.id;
    const grades = group.enrollments.map(enrollmentGrade);
    const completed = group.enrollments.filter((item) => item.courseProgress?.completedAt).length;
    return [<tr key={group.student.id} tabIndex="0" role="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? "" : group.student.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpanded(isOpen ? "" : group.student.id); }} className="cursor-pointer transition hover:bg-primary/5"><td className="px-5 py-4"><strong className="block">{studentName(group.student)}</strong><span className="text-xs text-text-secondary">{group.student.email}</span></td><td className="px-5 py-4">{group.enrollments.length}</td><td className="px-5 py-4 font-bold">{formatGrade(average(grades))}</td><td className="px-5 py-4">{completed} de {group.enrollments.length}</td><td className="px-5 py-4"><ChevronDown size={18} className={`transition ${isOpen ? "rotate-180 text-primary" : "text-text-secondary"}`} /></td></tr>, isOpen && <tr key={`${group.student.id}-detail`}><td colSpan="5" className="bg-background p-5"><EnrollmentDetails enrollments={group.enrollments} perspective="student" /></td></tr>];
  })}</tbody></table></div>;
}

function EnrollmentDetails({ enrollments, perspective }) {
  return <div className="space-y-4">{enrollments.map((enrollment) => <article key={enrollment.id} className="rounded-lg border border-border bg-surface p-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_100px] md:items-center"><div>{perspective === "course" ? <><strong>{studentName(enrollment.student)}</strong><span className="mt-1 block text-xs text-text-secondary">{enrollment.student.email}</span></> : <strong>{enrollment.course.title}</strong>}</div><ProgressBar value={enrollment.courseProgress?.completionPercent ?? 0} label="Avance" compact /><div><span className="block text-xs text-text-secondary">Calificación</span><strong className="text-lg">{formatGrade(enrollmentGrade(enrollment))}</strong></div></div><div className="mt-4 border-t border-border pt-4"><p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Detalle de actividades</p>{enrollment.grades.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{enrollment.grades.map((grade) => <div key={grade.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-xs"><span className="min-w-0 truncate">{grade.activity?.title ?? "Calificación final del curso"}</span><strong className="shrink-0">{formatGrade(grade.percentage)}</strong></div>)}</div> : <p className="mt-2 text-sm text-text-secondary">Este participante todavía no tiene actividades calificadas.</p>}</div></article>)}</div>;
}
