import { BookOpen, Clock3, Play, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [courseResult, enrollmentResult] = await Promise.all([
        api("/courses?limit=100"),
        api("/enrollments")
      ]);
      setCourses(courseResult.data);
      setEnrollments(enrollmentResult.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        eyebrow="Student workspace"
        title="My learning"
        description="Only published database courses appear here. Activities unlock in the sequence defined by the instructor."
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Active courses</h2>
        {enrollments.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className="panel p-6">
                <StatusBadge value={enrollment.status} />
                <h3 className="mt-4 text-xl font-bold">{enrollment.course.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{enrollment.course.category} · {enrollment.course.difficulty}</p>
                <div className="mt-5">
                  <ProgressBar value={enrollment.courseProgress?.completionPercent ?? 0} label="Course completion" />
                </div>
                <Link to={`/courses/${enrollment.courseId}/class`} className="btn-primary mt-5 w-full"><Play size={16} /> Continue class</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="No enrollments" description="Enroll in a published course below. No sample enrollments are included." /></div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Available courses</h2>
        {courses.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const enrollment = enrollmentByCourse.get(course.id);
              return (
                <article key={course.id} className="panel p-6">
                  <div className="flex items-center justify-between"><StatusBadge value={course.status} /><span className="flex items-center gap-1 text-xs text-text-secondary"><Clock3 size={14} /> {course.durationMinutes} min</span></div>
                  <h3 className="mt-4 text-xl font-bold">{course.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{course.description}</p>
                  <p className="mt-4 text-xs text-text-secondary">{course._count.blocks} blocks · Passing grade {course.passingGrade}%</p>
                  {enrollment ? (
                    <Link to={`/courses/${course.id}/class`} className="btn-secondary mt-5 w-full"><BookOpen size={16} /> Open course</Link>
                  ) : (
                    <button type="button" className="btn-primary mt-5 w-full" onClick={() => enroll(course.id)}><Plus size={16} /> Enroll</button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="No published courses" description="An instructor or platform administrator must build and publish a course first." /></div>
        )}
      </section>
    </div>
  );
}

