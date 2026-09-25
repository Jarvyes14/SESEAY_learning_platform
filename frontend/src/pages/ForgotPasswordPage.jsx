import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { api } from "../lib/api.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <Logo />
      <form className="panel mx-auto mt-20 max-w-md p-7" onSubmit={submit}>
        <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><Mail size={22} /></span>
        <h1 className="mt-5 font-display text-3xl font-bold">Recuperar acceso</h1>
        <p className="mt-2 text-sm text-text-secondary">Ingresa el correo de tu cuenta. Si está activa, enviaremos un enlace de recuperación de un solo uso.</p>
        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        {message && <p className="mt-4 rounded-md border border-success bg-success/10 p-3 text-sm text-success">{message}</p>}
        {error && <p className="mt-4 rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
        <button className="btn-primary mt-6 w-full" type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar enlace de recuperación"}</button>
        <Link className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary" to="/login"><ArrowLeft size={15} /> Volver al inicio de sesión</Link>
      </form>
    </main>
  );
}
