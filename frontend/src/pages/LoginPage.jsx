import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function homeForRole(role) {
  if (role === "student") return "/learning";
  if (role === "instructor") return "/instructor";
  return "/admin";
}

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
      navigate(homeForRole(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col p-8 lg:p-12">
        <Logo />
        <form className="mx-auto my-auto w-full max-w-md py-12" onSubmit={handleSubmit}>
          <p className="eyebrow">Secure platform access</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Sign in</h1>
          <p className="mt-3 text-text-secondary">
            Sign in with your account, or create one using an email previously authorized by an administrator.
          </p>
          {location.state?.accountCreated && <p className="mt-5 rounded-md border border-success bg-success/10 p-3 text-sm text-success">Your account was created. You can now sign in.</p>}
          {location.state?.passwordReset && <p className="mt-5 rounded-md border border-success bg-success/10 p-3 text-sm text-success">Your password was updated. You can now sign in.</p>}
          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-semibold">Email</span>
            <input className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">Password</span>
            <input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <div className="mt-3 text-right"><Link className="text-sm font-semibold text-primary" to="/forgot-password">Forgot your password?</Link></div>
          {error && <p className="mt-4 rounded-md border border-error bg-error/10 p-3 text-sm text-error">{error}</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"} <ArrowRight size={17} />
          </button>
          <p className="mt-5 text-center text-sm text-text-secondary">
            Have an authorized email? <Link className="font-semibold text-primary" to="/register">Create an account</Link>
          </p>
        </form>
      </section>
      <aside className="hidden items-center bg-primary p-12 text-inverse lg:flex">
        <div className="mx-auto max-w-xl">
          <span className="grid size-14 place-items-center rounded-lg bg-inverse/10"><LockKeyhole size={28} /></span>
          <h2 className="mt-7 font-display text-4xl font-bold">Functional learning management for public integrity.</h2>
          <p className="mt-5 text-lg leading-8 text-inverse/75">
            Build real courses, control sequential completion, review assignments, calculate grades, and issue verifiable certificates.
          </p>
        </div>
      </aside>
    </div>
  );
}
