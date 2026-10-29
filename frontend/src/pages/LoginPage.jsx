import { homeForUser } from "../lib/permissions.js";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import BrandPanel from "../components/BrandPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login({ email, password });
      navigate(homeForUser(user), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1fr_1fr]">
      <section className="flex min-w-0 flex-col px-4 py-6 sm:p-8 lg:p-12">
        <Logo />
        <form className="mx-auto my-auto w-full max-w-md py-8 sm:py-12" onSubmit={handleSubmit}>
          <p className="eyebrow">Acceso seguro a la plataforma</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Iniciar sesión</h1>
          <p className="mt-3 text-text-secondary">Ingresa con tu cuenta o crea una usando un correo previamente autorizado por un administrador.</p>
          {location.state?.accountCreated && <p className="mt-5 rounded-md border border-success bg-success/10 p-3 text-sm text-success">Tu cuenta fue creada. Ya puedes iniciar sesión.</p>}
          {location.state?.passwordReset && <p className="mt-5 rounded-md border border-success bg-success/10 p-3 text-sm text-success">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>}
          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-semibold">Correo electrónico</span>
            <input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">Contraseña</span>
            <input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <div className="mt-3 text-right"><Link className="text-sm font-semibold text-primary" to="/forgot-password">¿Olvidaste tu contraseña?</Link></div>
          {error && <p className="mt-4 rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting ? "Ingresando..." : "Iniciar sesión"} <ArrowRight size={17} />
          </button>
          <p className="mt-5 text-center text-sm text-text-secondary">
            ¿Tienes un correo autorizado? <Link className="font-semibold text-primary" to="/register">Crear una cuenta</Link>
          </p>
        </form>
      </section>
      <BrandPanel />
    </div>
  );
}
