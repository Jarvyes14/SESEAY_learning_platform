import { ArrowRight, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import PasswordPolicyHint from "../components/PasswordPolicyHint.jsx";
import { api } from "../lib/api.js";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api("/settings/public")
      .then((result) => setPolicy(result.data.passwordPolicy))
      .catch(() => setPolicy(null));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password
        })
      });
      navigate("/login", { replace: true, state: { accountCreated: true } });
    } catch (requestError) {
      setError(
        requestError.details?.length
          ? `${requestError.message}: ${requestError.details.join(", ")}`
          : requestError.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col p-8 lg:p-12">
        <Logo />
        <form className="mx-auto my-auto w-full max-w-md py-12" onSubmit={handleSubmit}>
          <p className="eyebrow">Registro autorizado</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Crea tu cuenta</h1>
          <p className="mt-3 text-text-secondary">Usa el correo electrónico previamente autorizado por un administrador.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" value={form.firstName} onChange={(value) => update("firstName", value)} />
            <Field label="Apellidos" value={form.lastName} onChange={(value) => update("lastName", value)} />
          </div>
          <div className="mt-5"><Field label="Email" type="email" autoComplete="email" value={form.email} onChange={(value) => update("email", value)} /></div>
          <div className="mt-5"><Field label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={(value) => update("password", value)} /></div>
          <div className="mt-2"><PasswordPolicyHint policy={policy} /></div>
          <div className="mt-5"><Field label="Confirmar contraseña" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} /></div>
          {error && <p className="mt-4 rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting ? "Creando cuenta..." : "Crear cuenta"} <ArrowRight size={17} />
          </button>
          <p className="mt-5 text-center text-sm text-text-secondary">
            ¿Ya tienes una cuenta? <Link className="font-semibold text-primary" to="/login">Iniciar sesión</Link>
          </p>
        </form>
      </section>
      <aside className="hidden items-center bg-primary p-12 text-inverse lg:flex">
        <div className="mx-auto max-w-xl">
          <span className="grid size-14 place-items-center rounded-lg bg-inverse/10"><UserPlus size={28} /></span>
          <h2 className="mt-7 font-display text-4xl font-bold">Tu cuenta, creada por ti.</h2>
          <p className="mt-5 text-lg leading-8 text-inverse/75">Los administradores autorizan el acceso. Tú eliges tus credenciales y mantienes privada tu contraseña.</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required {...props} />
    </label>
  );
}
