import { AlertTriangle, BarChart3, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function ProgressPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    api(user.role === "student" ? "/progress" : "/enrollments")
      .then((result) => setRecords(result.data))
      .catch((requestError) => setError(requestError.message));
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  async function resetProgress() {
    if (!resetTarget) return;
    setResetting(true);
    setError("");
    setSuccess("");
    try {
      await api(`/enrollments/${resetTarget.id}/reset-progress`, { method: "POST" });
      setResetTarget(null);
      setSuccess("El progreso se reinició correctamente.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Seguimiento" title="Progreso de cursos" description="Los porcentajes se calculan a partir de las actividades completadas, no de las visitas a las páginas." />
      {error && <p className="mt-5 text-error">{error}</p>}
      {success && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm font-semibold text-success">{success}</p>}
      {records.length ? (
        <div className="mt-7 overflow-hidden rounded-lg border border-border bg-surface">
          {records.map((record) => {
            const progress = user.role === "student" ? record : record.courseProgress;
            const course = user.role === "student" ? record.enrollment.course : record.course;
            return <div key={record.id} className={`grid gap-4 border-b border-border p-5 last:border-0 ${user.role === "student" ? "md:grid-cols-[1fr_260px_130px]" : "md:grid-cols-[minmax(0,1fr)_240px_120px_auto]"} md:items-center`}><div className="min-w-0"><p className="break-words font-bold">{course.title}</p>{record.student && <p className="mt-1 break-words text-xs text-text-secondary">{record.student.firstName} {record.student.lastName} · {record.student.email}</p>}</div><ProgressBar value={progress?.completionPercent ?? 0} compact /><StatusBadge value={record.enrollment?.status ?? record.status} />{user.role !== "student" && <button type="button" className="btn-secondary whitespace-nowrap text-error" onClick={() => { setSuccess(""); setResetTarget(record); }}><RotateCcw size={15} /> Reiniciar progreso</button>}</div>;
          })}
        </div>
      ) : <div className="mt-7"><EmptyState title="No hay registros de progreso" description="El progreso aparecerá cuando un estudiante se inscriba en un curso publicado." action={<BarChart3 className="mx-auto text-text-secondary" />} /></div>}
      {resetTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-progress-title">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-error/10 text-error"><AlertTriangle size={20} /></span><div><h2 id="reset-progress-title" className="text-xl font-bold">¿Reiniciar el progreso del curso?</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Se eliminarán permanentemente los intentos, calificaciones, datos de finalización y el certificado de <strong className="text-text-primary">{resetTarget.student.firstName} {resetTarget.student.lastName}</strong> en <strong className="text-text-primary">{resetTarget.course.title}</strong>. La persona seguirá inscrita y podrá comenzar de nuevo.</p></div></div>
              <button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-muted" onClick={() => setResetTarget(null)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={resetting} onClick={() => setResetTarget(null)}>Cancelar</button><button type="button" className="btn-primary bg-error hover:bg-error/90" disabled={resetting} onClick={resetProgress}><RotateCcw size={16} /> {resetting ? "Reiniciando..." : "Reiniciar progreso"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
