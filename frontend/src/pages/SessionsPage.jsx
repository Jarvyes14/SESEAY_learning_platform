import { Clock3, LogOut, MonitorSmartphone, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short"
});

function describeDevice(userAgent) {
  if (!userAgent) return "Dispositivo desconocido";

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Navegador";
  const system = userAgent.includes("Android")
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : userAgent.includes("Windows")
        ? "Windows"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "sistema desconocido";

  return `${browser} en ${system}`;
}

export default function SessionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      const result = await api("/auth/sessions");
      setSessions(result.data);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function revokeSession(session) {
    setWorkingId(session.id);
    setError("");
    setMessage("");
    try {
      if (session.current) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      await api(`/auth/sessions/${session.id}`, { method: "DELETE" });
      setMessage("La sesión seleccionada se cerró correctamente.");
      await loadSessions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  async function revokeOtherSessions() {
    setWorkingId("others");
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/sessions", { method: "DELETE" });
      setMessage(
        result.revoked
          ? `Se cerraron ${result.revoked} sesiones adicionales.`
          : "No había otras sesiones abiertas."
      );
      await loadSessions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="Seguridad de la cuenta"
        title="Sesiones activas"
        description="Revisa dónde está abierta tu cuenta y cierra cualquier acceso que no reconozcas."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={revokeOtherSessions}
            disabled={workingId !== "" || sessions.length < 2}
          >
            <Trash2 size={16} /> Cerrar otras sesiones
          </button>
        }
      />

      {message && (
        <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-text-secondary">Cargando sesiones…</p>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <article key={session.id} className="panel flex gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <MonitorSmartphone size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{describeDevice(session.userAgent)}</h2>
                  {session.current && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                      <ShieldCheck size={13} /> Esta sesión
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  Dirección IP: {session.ipAddress || "No disponible"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                  <Clock3 size={13} /> Última actividad: {dateFormatter.format(new Date(session.lastSeenAt))}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Inició: {dateFormatter.format(new Date(session.createdAt))} · Expira: {dateFormatter.format(new Date(session.expiresAt))}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-error disabled:opacity-60"
                  onClick={() => revokeSession(session)}
                  disabled={workingId !== ""}
                >
                  <LogOut size={15} />
                  {workingId === session.id
                    ? "Cerrando…"
                    : session.current
                      ? "Cerrar esta sesión"
                      : "Cerrar sesión"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
