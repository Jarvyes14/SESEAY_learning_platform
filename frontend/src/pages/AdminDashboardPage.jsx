import { Award, BookOpen, Download, GraduationCap, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DisabledButton from "../components/DisabledButton.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatCard from "../components/StatCard.jsx";
import { api } from "../lib/api.js";

const emptyOverview = {
  users: 0,
  courses: 0,
  publishedCourses: 0,
  enrollments: 0,
  completed: 0,
  pendingReviews: 0,
  certificates: 0,
  completionRate: 0
};

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/reports/overview")
      .then((result) => setOverview(result.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="Platform administration"
        title="Admin dashboard"
        description="Live platform metrics from PostgreSQL. Empty values remain zero until real users, courses, and enrollments are created."
        actions={
          <>
            <DisabledButton><Upload size={16} /> Bulk import</DisabledButton>
            <DisabledButton><Download size={16} /> Export report</DisabledButton>
          </>
        }
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={overview.users} detail="Real active and inactive accounts" icon={Users} />
        <StatCard label="Courses" value={overview.courses} detail={`${overview.publishedCourses} published`} icon={BookOpen} tone="secondary" />
        <StatCard label="Enrollments" value={overview.enrollments} detail={`${overview.completed} completed`} icon={GraduationCap} tone="success" />
        <StatCard label="Certificates" value={overview.certificates} detail="Issued after passing completion" icon={Award} tone="warning" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Link to="/admin/users" className="panel p-6 transition hover:border-primary">
          <Users className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Manage users</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Create role-based accounts and assign organizations.</p>
        </Link>
        <Link to="/instructor" className="panel p-6 transition hover:border-primary">
          <BookOpen className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Manage courses</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Create courses and open the complete course builder.</p>
        </Link>
        <Link to="/grades" className="panel p-6 transition hover:border-primary">
          <GraduationCap className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Review grading</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{overview.pendingReviews} assignment submissions await review.</p>
        </Link>
      </div>
    </div>
  );
}

