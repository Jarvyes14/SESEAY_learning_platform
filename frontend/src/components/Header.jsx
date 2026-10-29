import { can } from "../lib/permissions.js";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleLabel } from "../lib/labels.js";
import Logo from "./Logo.jsx";

const navigation = [
  ["Inicio", "/admin", LayoutDashboard, "reports.view"],
  ["Mi aprendizaje", "/learning", LibraryBig, "learning.view"],
  ["Usuarios", "/admin/users", Users, "users.view"],
  ["Roles y permisos", "/admin/roles", ShieldCheck, "roles.view"],
  ["Cursos", "/instructor", BookOpen, "courses.view"],
  ["Progreso", "/progress", BarChart3, "progress.view"],
  ["Calificaciones", "/grades", GraduationCap, "grades.view"],
  ["Certificados", "/certificates", Award, "certificates.view", "certificate_templates.view"],
  ["Configuración", "/admin/settings", Settings, "settings.view"]
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navigation.filter(([, , , ...keys]) => keys.some(key => can(user, key)));

  useEffect(() => setMenuOpen(false), [pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="container-page flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-0 py-2">
        <div className="min-w-0 flex-1"><Logo /></div>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-primary xl:hidden" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="main-navigation">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="main-navigation" className={`${menuOpen ? "grid" : "hidden"} order-last w-full grid-cols-1 gap-1 border-t border-border pt-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:border-0 xl:pt-1`} aria-label="Navegación principal" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
          {links.map(([label, href, Icon]) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/admin"}
              className={({ isActive }) =>
                `flex min-h-9 items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold ${
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
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div className="max-w-48 leading-tight">
            <p className="truncate text-sm font-semibold" title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}>{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-text-secondary">{user?.roleDisplayName ?? roleLabel(user?.role)}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="grid size-11 place-items-center rounded-md text-text-secondary hover:bg-surface-muted hover:text-error"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
        {menuOpen && <div className="order-last flex w-full items-center justify-between gap-3 border-t border-border pt-3 sm:hidden"><div><p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p><p className="text-xs text-text-secondary">{user?.roleDisplayName ?? roleLabel(user?.role)}</p></div><button type="button" onClick={handleLogout} className="btn-secondary"><LogOut size={18} />Salir</button></div>}
      </div>
    </header>
  );
}
