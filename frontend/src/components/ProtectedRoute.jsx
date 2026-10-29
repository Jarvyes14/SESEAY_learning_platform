import { can, homeForUser } from "../lib/permissions.js";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ permissions }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container-page py-20 text-center text-text-secondary">Cargando tu espacio de trabajo…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (permissions && !permissions.some(key => can(user, key))) {
    return <Navigate to={homeForUser(user)} replace />;
  }
  return <Outlet />;
}
