import { CheckCircle2, GraduationCap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [pending, setPending] = useState([]);
  const [review, setReview] = useState({});
  const [error, setError] = useState("");
  const canReview = ["platform_admin", "government_admin", "instructor"].includes(user.role);

  const load = useCallback(async () => {
    try {
      const gradeResult = await api("/grades");
      setGrades(gradeResult.data);
      if (canReview) {
        const pendingResult = await api("/grades/pending");
        setPending(pendingResult.data);
      }
    } catch (requestError) { setError(requestError.message); }
  }, [canReview]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Evaluación" title="Calificaciones y revisión de tareas" description="Los cuestionarios y exámenes se califican automáticamente. Las tareas permanecen pendientes hasta que una persona autorizada asigne una calificación." />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      {canReview && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Tareas pendientes de revisión ({pending.length})</h2>
          {pending.length ? <div className="mt-5 space-y-5">{pending.map((attempt) => {
            const maxScore = attempt.activity.points || 100;
            return <article key={attempt.id} className="panel p-6"><div className="flex flex-wrap justify-between gap-4"><div><StatusBadge value={attempt.status} /><h3 className="mt-3 text-xl font-bold">{attempt.activity.title}</h3><p className="mt-1 text-sm text-text-secondary">{attempt.student.firstName} {attempt.student.lastName} · {attempt.activity.topic.block.course.title}</p></div><GraduationCap className="text-primary" /></div><pre className="mt-5 overflow-auto rounded-md bg-surface-muted p-4 text-xs">{JSON.stringify(attempt.response, null, 2)}</pre><div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr_auto]"><label><span className="mb-2 block text-sm font-semibold">Calificación / {maxScore}</span><input className="input-field" type="number" min="0" max={maxScore} value={review[attempt.id]?.score ?? ""} onChange={(event) => setReview({ ...review, [attempt.id]: { ...review[attempt.id], score: event.target.value } })} /></label><label><span className="mb-2 block text-sm font-semibold">Comentarios</span><input className="input-field" value={review[attempt.id]?.feedback ?? ""} onChange={(event) => setReview({ ...review, [attempt.id]: { ...review[attempt.id], feedback: event.target.value } })} /></label><button type="button" className="btn-primary self-end" disabled={review[attempt.id]?.score === undefined} onClick={() => submitReview(attempt)}><CheckCircle2 size={16} /> Calificar</button></div></article>;
          })}</div> : <div className="mt-5"><EmptyState title="No hay revisiones pendientes" description="Aquí aparecerán las tareas enviadas que estén esperando calificación." /></div>}
        </section>
      )}
      <section className="mt-9">
        <h2 className="text-2xl font-bold">Registros de calificaciones ({grades.length})</h2>
        {grades.length ? <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-3xl text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-text-secondary"><tr><th className="px-5 py-4">Curso</th><th className="px-5 py-4">Estudiante</th><th className="px-5 py-4">Actividad</th><th className="px-5 py-4">Calificación</th><th className="px-5 py-4">Tipo</th></tr></thead><tbody className="divide-y divide-border">{grades.map((grade) => <tr key={grade.id}><td className="px-5 py-4 font-semibold">{grade.course.title}</td><td className="px-5 py-4">{grade.student.firstName} {grade.student.lastName}</td><td className="px-5 py-4 text-text-secondary">{grade.activity?.title ?? "Calificación final del curso"}</td><td className="px-5 py-4 font-bold">{grade.percentage.toFixed(1)}%</td><td className="px-5 py-4">{grade.isFinal ? "FINAL" : "ACTIVIDAD"}</td></tr>)}</tbody></table></div> : <div className="mt-5"><EmptyState title="No hay calificaciones" description="Las calificaciones se crean después de enviar cuestionarios, exámenes o tareas revisadas." /></div>}
      </section>
    </div>
  );
}
