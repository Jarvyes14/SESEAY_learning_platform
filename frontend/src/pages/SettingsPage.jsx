import { MailCheck, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import { api } from "../lib/api.js";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/settings")
      .then((result) => {
        setSettings(result.data);
        setSmtpConfigured(result.smtpConfigured);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        platformName: settings.platformName,
        platformSubtitle: settings.platformSubtitle,
        supportEmail: settings.supportEmail || null,
        maxActiveSessions: Number(settings.maxActiveSessions),
        passwordMinLength: Number(settings.passwordMinLength),
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireLowercase: settings.passwordRequireLowercase,
        passwordRequireNumber: settings.passwordRequireNumber,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        passwordResetExpiryMinutes: Number(settings.passwordResetExpiryMinutes)
      };
      const result = await api("/settings", { method: "PATCH", body: JSON.stringify(payload) });
      setSettings(result.data);
      setMessage("Platform settings saved. Branding updates appear after reloading the page.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="container-page py-20 text-center text-text-secondary">Loading settings…</div>;
  }

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Platform administration" title="General settings" description="Manage identity, access policies, sessions, and account email behavior from one place." />
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <form className="mt-7 space-y-6" onSubmit={save}>
        <SettingsSection icon={SlidersHorizontal} title="Platform identity" description="Shown in the header, login, and account emails.">
          <Field label="Platform name" value={settings.platformName} onChange={(value) => update("platformName", value)} />
          <Field label="Subtitle" value={settings.platformSubtitle} onChange={(value) => update("platformSubtitle", value)} />
          <Field label="Support and reply-to email" type="email" required={false} value={settings.supportEmail ?? ""} onChange={(value) => update("supportEmail", value)} />
        </SettingsSection>

        <SettingsSection icon={ShieldCheck} title="Access policies" description="Applied immediately to new passwords and future sign-ins.">
          <Field label="Maximum active sessions per user" type="number" min="1" max="50" value={settings.maxActiveSessions} onChange={(value) => update("maxActiveSessions", value)} />
          <Field label="Minimum password length" type="number" min="8" max="72" value={settings.passwordMinLength} onChange={(value) => update("passwordMinLength", value)} />
          <Field label="Recovery link duration (minutes)" type="number" min="10" max="1440" value={settings.passwordResetExpiryMinutes} onChange={(value) => update("passwordResetExpiryMinutes", value)} />
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
            <PolicyToggle label="Require uppercase letter" checked={settings.passwordRequireUppercase} onChange={(value) => update("passwordRequireUppercase", value)} />
            <PolicyToggle label="Require lowercase letter" checked={settings.passwordRequireLowercase} onChange={(value) => update("passwordRequireLowercase", value)} />
            <PolicyToggle label="Require number" checked={settings.passwordRequireNumber} onChange={(value) => update("passwordRequireNumber", value)} />
            <PolicyToggle label="Require special character" checked={settings.passwordRequireSpecial} onChange={(value) => update("passwordRequireSpecial", value)} />
          </div>
        </SettingsSection>

        <section className="panel flex items-start gap-4 p-6">
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${smtpConfigured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}><MailCheck size={22} /></span>
          <div>
            <h2 className="font-bold">Email delivery</h2>
            <p className="mt-1 text-sm text-text-secondary">{smtpConfigured ? "SMTP is configured. Invitations and recovery messages can be delivered." : "SMTP is not configured. Add the SMTP variables to .env and recreate the backend container."}</p>
          </div>
        </section>

        <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save settings"}</button></div>
      </form>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="panel p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={22} /></span>
        <div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-text-secondary">{description}</p></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", required = true, ...props }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...props} /></label>;
}

function PolicyToggle({ label, checked, onChange }) {
  return <label className="flex items-center gap-3 rounded-md border border-border p-4"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="text-sm font-semibold">{label}</span></label>;
}
