import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    api(user.role === "student" ? "/progress" : "/enrollments")
      .then((result) => setRecords(result.data))
      .catch((requestError) => setError(requestError.message));
  }, [user.role]);

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Progress tracking" title="Course progress" description="Completion percentages are calculated from completed database activities, not page visits." />
      {error && <p className="mt-5 text-error">{error}</p>}
      {records.length ? (
        <div className="mt-7 overflow-hidden rounded-lg border border-border bg-surface">
          {records.map((record) => {
            const progress = user.role === "student" ? record : record.courseProgress;
            const course = user.role === "student" ? record.enrollment.course : record.course;
            return <div key={record.id} className="grid gap-4 border-b border-border p-5 last:border-0 md:grid-cols-[1fr_260px_130px] md:items-center"><div><p className="font-bold">{course.title}</p>{record.student && <p className="mt-1 text-xs text-text-secondary">{record.student.firstName} {record.student.lastName}</p>}</div><ProgressBar value={progress?.completionPercent ?? 0} compact /><StatusBadge value={record.enrollment?.status ?? record.status} /></div>;
          })}
        </div>
      ) : <div className="mt-7"><EmptyState title="No progress records" description="Progress appears after a student enrolls in a published course." action={<BarChart3 className="mx-auto text-text-secondary" />} /></div>}
    </div>
  );
}

