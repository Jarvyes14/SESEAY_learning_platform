import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import PasswordPolicyHint from "../components/PasswordPolicyHint.jsx";
import { api } from "../lib/api.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
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
    if (!token) return setError("The recovery link is incomplete.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (requestError) {
      setError(requestError.details?.join(". ") || requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <Logo />
      <form className="panel mx-auto mt-20 max-w-md p-7" onSubmit={submit}>
        <h1 className="font-display text-3xl font-bold">Create a new password</h1>
        <p className="mt-2 text-sm text-text-secondary">This link can be used only once.</p>
        <label className="mt-6 block"><span className="mb-2 block text-sm font-semibold">New password</span><input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" /></label>
        <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold">Confirm password</span><input className="input-field" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" /></label>
        <div className="mt-3"><PasswordPolicyHint policy={policy} /></div>
        {error && <p className="mt-4 rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
        <button className="btn-primary mt-6 w-full" type="submit" disabled={submitting}>{submitting ? "Updating…" : "Update password"}</button>
        <Link className="mt-5 block text-center text-sm font-semibold text-primary" to="/login">Back to sign in</Link>
      </form>
    </main>
  );
}
