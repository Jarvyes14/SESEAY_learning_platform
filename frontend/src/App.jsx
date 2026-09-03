import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import CertificatesPage from "./pages/CertificatesPage.jsx";
import CourseBuilderPage from "./pages/CourseBuilderPage.jsx";
import CoursePlayerPage from "./pages/CoursePlayerPage.jsx";
import GradesPage from "./pages/GradesPage.jsx";
import InstructorDashboardPage from "./pages/InstructorDashboardPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProgressPage from "./pages/ProgressPage.jsx";
import SessionsPage from "./pages/SessionsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import StudentDashboardPage from "./pages/StudentDashboardPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

const adminRoles = ["platform_admin", "government_admin", "organization_admin"];
const editorRoles = ["platform_admin", "government_admin", "instructor"];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route element={<ProtectedRoute roles={adminRoles} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["platform_admin"]} />}>
            <Route path="admin/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={editorRoles} />}>
            <Route path="instructor" element={<InstructorDashboardPage />} />
            <Route path="courses/:id/builder" element={<CourseBuilderPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["student"]} />}>
            <Route path="student" element={<StudentDashboardPage />} />
            <Route path="courses/:id/class" element={<CoursePlayerPage />} />
          </Route>
          <Route path="progress" element={<ProgressPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
