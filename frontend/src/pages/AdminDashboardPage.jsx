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
        eyebrow="Administración de la plataforma"
        title="Panel de administración"
        description="Métricas actuales de usuarios, cursos, inscripciones y certificados registrados en la plataforma."
        actions={
          <>
            <DisabledButton><Upload size={16} /> Importación masiva</DisabledButton>
            <DisabledButton><Download size={16} /> Exportar reporte</DisabledButton>
          </>
        }
      />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios" value={overview.users} detail="Cuentas activas e inactivas" icon={Users} />
        <StatCard label="Cursos" value={overview.courses} detail={`${overview.publishedCourses} publicados`} icon={BookOpen} tone="secondary" />
        <StatCard label="Inscripciones" value={overview.enrollments} detail={`${overview.completed} completadas`} icon={GraduationCap} tone="success" />
        <StatCard label="Certificados" value={overview.certificates} detail="Emitidos después de aprobar" icon={Award} tone="warning" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Link to="/admin/users" className="panel p-6 transition hover:border-primary">
          <Users className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Administrar usuarios</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Autoriza cuentas por rol y asigna organizaciones.</p>
        </Link>
        <Link to="/instructor" className="panel p-6 transition hover:border-primary">
          <BookOpen className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Administrar cursos</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Crea cursos y utiliza el constructor completo.</p>
        </Link>
        <Link to="/grades" className="panel p-6 transition hover:border-primary">
          <GraduationCap className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Revisar calificaciones</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{overview.pendingReviews} tareas esperan revisión.</p>
        </Link>
      </div>
    </div>
  );
}
