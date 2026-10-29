import { lazy, Suspense } from "react";
const RolesPage = lazy(() => import("./pages/RolesPage.jsx"));
import { useAuth } from "./context/AuthContext.jsx";
import { homeForUser } from "./lib/permissions.js";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.jsx"));
const CertificatesPage = lazy(() => import("./pages/CertificatesPage.jsx"));
const CourseBuilderPage = lazy(() => import("./pages/CourseBuilderPage.jsx"));
const CoursePlayerPage = lazy(() => import("./pages/CoursePlayerPage.jsx"));
const GradesPage = lazy(() => import("./pages/GradesPage.jsx"));
const InstructorDashboardPage = lazy(() => import("./pages/InstructorDashboardPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const ProgressPage = lazy(() => import("./pages/ProgressPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const StudentDashboardPage = lazy(() => import("./pages/StudentDashboardPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));

function Home() { const { user } = useAuth(); return <Navigate to={homeForUser(user)} replace />; }
function Account() { return <div className="container-page py-10"><h1 className="text-2xl font-bold">Mi cuenta</h1><p className="mt-4 text-text-secondary">Tu cuenta está activa. Las funciones disponibles dependen de los permisos de tu rol.</p><a className="btn-secondary mt-5" href="/change-password">Cambiar contraseña</a></div>; }
export default function App() {
  return (
    <Suspense fallback={<div className="container-page py-10" role="status">Cargando pantalla...</div>}><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="account" element={<Account />} />
          <Route element={<ProtectedRoute permissions={["reports.view"]} />}><Route path="admin" element={<AdminDashboardPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["users.view"]} />}><Route path="admin/users" element={<UsersPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["roles.view"]} />}><Route path="admin/roles" element={<RolesPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["settings.view"]} />}><Route path="admin/settings" element={<SettingsPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["courses.view"]} />}>
            <Route path="instructor" element={<InstructorDashboardPage />} />
            <Route path="courses/:id/builder" element={<CourseBuilderPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={["learning.view"]} />}>
            <Route path="student" element={<Navigate to="/learning" replace />} />
            <Route path="learning" element={<StudentDashboardPage />} />
            <Route path="courses/:id/class" element={<CoursePlayerPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={["progress.view"]} />}><Route path="progress" element={<ProgressPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["grades.view"]} />}><Route path="grades" element={<GradesPage />} /></Route>
          <Route element={<ProtectedRoute permissions={["certificates.view", "certificate_templates.view"]} />}><Route path="certificates" element={<CertificatesPage />} /></Route>
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense>
  );
}
