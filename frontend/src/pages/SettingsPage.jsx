import useUnsavedChanges from "../hooks/useUnsavedChanges.js";
import { can } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { MailCheck, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import BrandingEditor from "../components/BrandingEditor.jsx";
import { normalizeBranding } from "../lib/branding.js";
import { api } from "../lib/api.js";
import { usePlatform } from "../context/PlatformContext.jsx";

export default function SettingsPage() {
  const { user } = useAuth();
  const { refreshPlatform } = usePlatform();
  const [tab, setTab] = useState("general");
  const [baseline, setBaseline] = useState(null);
  const [settings, setSettings] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [brandUploading, setBrandUploading] = useState(false);

  useEffect(() => {
    api("/settings")
      .then((result) => {
        const data = { ...result.data, branding: normalizeBranding(result.data.branding) };
        setSettings(data); setBaseline(JSON.stringify(data));
        setSmtpConfigured(result.smtpConfigured);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const dirty = baseline !== null && JSON.stringify(settings) !== baseline;
  useUnsavedChanges(dirty);

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
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        logoUrl: settings.logoUrl || null,
        branding: settings.branding,
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
      const data = { ...result.data, branding: normalizeBranding(result.data.branding) };
      setSettings(data); setBaseline(JSON.stringify(data));
      await refreshPlatform();
      setMessage("La configuración y el diseño de la plataforma se guardaron correctamente.");
    } catch (requestError) {
      setError(requestError.details?.fieldErrors ? `${requestError.message}: ${Object.entries(requestError.details.fieldErrors).map(([key, values]) => `${key}: ${values.join(" ")}`).join(" · ")}` : requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="container-page py-20 text-center text-text-secondary">{error || "Cargando configuración…"}</div>;
  }

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Administración de la plataforma" title="Configuración general" description="Administra la identidad visual, las políticas de acceso, las sesiones y el correo desde un solo lugar." />
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Secciones de configuración">{[["general", "General"], ["brand", "Identidad visual"], ["access", "Acceso y sesiones"]].map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={tab === key} className={tab === key ? "btn-primary" : "btn-secondary"} onClick={() => setTab(key)}>{label}</button>)}</div>
      <form className="mt-5" onSubmit={save}><fieldset disabled={!can(user, "settings.edit")} className="min-w-0 space-y-6">
        {tab === "general" && <SettingsSection icon={SlidersHorizontal} title="Identidad de la plataforma" description="Se muestra en el encabezado, el acceso y los correos de la cuenta.">
          <Field label="Nombre de la plataforma" value={settings.platformName} onChange={(value) => update("platformName", value)} />
          <Field label="Subtítulo" value={settings.platformSubtitle} onChange={(value) => update("platformSubtitle", value)} />
          <Field label="Correo de soporte y respuesta" type="email" required={false} value={settings.supportEmail ?? ""} onChange={(value) => update("supportEmail", value)} />
        </SettingsSection>}

        {tab === "brand" && <BrandingEditor settings={settings} onChange={setSettings} onError={setError} onBusyChange={setBrandUploading} />}

        {tab === "access" && <SettingsSection icon={ShieldCheck} title="Políticas de acceso" description="Se aplican inmediatamente a las contraseñas nuevas y los próximos ingresos.">
          <Field label="Máximo de sesiones activas por usuario" type="number" min="1" max="50" value={settings.maxActiveSessions} onChange={(value) => update("maxActiveSessions", value)} />
          <Field label="Longitud mínima de contraseña" type="number" min="8" max="72" value={settings.passwordMinLength} onChange={(value) => update("passwordMinLength", value)} />
          <Field label="Duración del enlace de recuperación (minutos)" type="number" min="10" max="1440" value={settings.passwordResetExpiryMinutes} onChange={(value) => update("passwordResetExpiryMinutes", value)} />
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
            <PolicyToggle label="Requerir una letra mayúscula" checked={settings.passwordRequireUppercase} onChange={(value) => update("passwordRequireUppercase", value)} />
            <PolicyToggle label="Requerir una letra minúscula" checked={settings.passwordRequireLowercase} onChange={(value) => update("passwordRequireLowercase", value)} />
            <PolicyToggle label="Requerir un número" checked={settings.passwordRequireNumber} onChange={(value) => update("passwordRequireNumber", value)} />
            <PolicyToggle label="Requerir un carácter especial" checked={settings.passwordRequireSpecial} onChange={(value) => update("passwordRequireSpecial", value)} />
          </div>
        </SettingsSection>}

        {tab === "general" && <section className="panel flex items-start gap-4 p-6">
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${smtpConfigured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}><MailCheck size={22} /></span>
          <div>
            <h2 className="font-bold">Envío de correo</h2>
            <p className="mt-1 text-sm text-text-secondary">{smtpConfigured ? "SMTP está configurado. Las invitaciones y mensajes de recuperación pueden enviarse." : "SMTP no está configurado. Agrega las variables SMTP al archivo .env y recrea el contenedor del backend."}</p>
          </div>
        </section>}

        <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-between gap-3 border-t border-border bg-surface/95 p-3 backdrop-blur sm:p-4"><span className="text-xs text-text-secondary">{dirty ? "Cambios sin guardar" : "Configuración guardada"}</span><button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving || brandUploading || !dirty}><Save size={16} /> {saving ? "Guardando…" : "Guardar configuración"}</button></div>
      </fieldset></form>
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
