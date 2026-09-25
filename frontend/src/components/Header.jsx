import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleLabel } from "../lib/labels.js";
import Logo from "./Logo.jsx";

const linksByRole = {
  platform_admin: [
    ["Inicio", "/admin", LayoutDashboard], ["Mi aprendizaje", "/learning", LibraryBig], ["Usuarios", "/admin/users", Users], ["Cursos", "/instructor", BookOpen], ["Progreso", "/progress", BarChart3], ["Calificaciones", "/grades", GraduationCap], ["Certificados", "/certificates", Award], ["Configuración", "/admin/settings", Settings]
  ],
  government_admin: [
    ["Inicio", "/admin", LayoutDashboard], ["Mi aprendizaje", "/learning", LibraryBig], ["Usuarios", "/admin/users", Users], ["Cursos", "/instructor", BookOpen], ["Progreso", "/progress", BarChart3], ["Calificaciones", "/grades", GraduationCap], ["Certificados", "/certificates", Award]
  ],
  organization_admin: [
    ["Inicio", "/admin", LayoutDashboard], ["Mi aprendizaje", "/learning", LibraryBig], ["Usuarios", "/admin/users", Users], ["Cursos", "/instructor", BookOpen], ["Progreso", "/progress", BarChart3], ["Calificaciones", "/grades", GraduationCap], ["Certificados", "/certificates", Award]
  ],
  instructor: [
    ["Panel", "/instructor", LayoutDashboard], ["Mi aprendizaje", "/learning", LibraryBig], ["Progreso", "/progress", BarChart3], ["Calificaciones", "/grades", GraduationCap], ["Certificados", "/certificates", Award]
  ],
  student: [
    ["Mis cursos", "/learning", BookOpen], ["Progreso", "/progress", BarChart3], ["Calificaciones", "/grades", GraduationCap], ["Certificados", "/certificates", Award]
  ]
};

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = linksByRole[user?.role] ?? [];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="container-page flex min-h-16 flex-wrap items-center gap-6 py-3">
        <Logo />
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Navegación principal">
          {links.map(([label, href, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-l border-border pl-4">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-text-secondary">{roleLabel(user?.role)}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-error"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
