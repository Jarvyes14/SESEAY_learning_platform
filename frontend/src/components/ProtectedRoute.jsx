import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container-page py-20 text-center text-text-secondary">Loading your workspace…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    const home = user.role === "student" ? "/student" : user.role === "instructor" ? "/instructor" : "/admin";
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
