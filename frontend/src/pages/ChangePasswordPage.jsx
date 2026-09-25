import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import PasswordPolicyHint from "../components/PasswordPolicyHint.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api("/settings/public").then((result) => setPolicy(result.data.passwordPolicy)).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    try {
      const updated = await changePassword({ currentPassword, newPassword });
      navigate(updated.role === "student" ? "/student" : updated.role === "instructor" ? "/instructor" : "/admin", { replace: true });
    } catch (requestError) {
      setError(requestError.details?.join(". ") || requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Seguridad de la cuenta" title={user.mustChangePassword ? "Crea tu contraseña personal" : "Cambiar contraseña"} description={user.mustChangePassword ? "Debes reemplazar tu credencial temporal antes de usar la plataforma." : "Al cambiar tu contraseña se cerrarán tus demás sesiones activas."} />
      <form className="panel mt-7 max-w-xl space-y-5 p-7" onSubmit={submit}>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Contraseña actual</span><input className="input-field" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Nueva contraseña</span><input className="input-field" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Confirmar nueva contraseña</span><input className="input-field" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" /></label>
        <PasswordPolicyHint policy={policy} />
        {error && <p className="rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar nueva contraseña"}</button>
      </form>
    </div>
  );
}
