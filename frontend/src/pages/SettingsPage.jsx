import { Image, MailCheck, Palette, Save, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import { api } from "../lib/api.js";
import { usePlatform } from "../context/PlatformContext.jsx";

export default function SettingsPage() {
  const { refreshPlatform } = usePlatform();
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

  function selectLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Selecciona un archivo de imagen.");
    if (file.size > 1_000_000) return setError("El logo no puede superar 1 MB.");
    const reader = new FileReader();
    reader.onload = () => update("logoUrl", reader.result);
    reader.readAsDataURL(file);
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
      await refreshPlatform();
      setMessage("La configuración y el diseño de la plataforma se guardaron correctamente.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="container-page py-20 text-center text-text-secondary">Cargando configuración…</div>;
  }

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Administración de la plataforma" title="Configuración general" description="Administra la identidad visual, las políticas de acceso, las sesiones y el correo desde un solo lugar." />
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <form className="mt-7 space-y-6" onSubmit={save}>
        <SettingsSection icon={SlidersHorizontal} title="Identidad de la plataforma" description="Se muestra en el encabezado, el acceso y los correos de la cuenta.">
          <Field label="Nombre de la plataforma" value={settings.platformName} onChange={(value) => update("platformName", value)} />
          <Field label="Subtítulo" value={settings.platformSubtitle} onChange={(value) => update("platformSubtitle", value)} />
          <Field label="Correo de soporte y respuesta" type="email" required={false} value={settings.supportEmail ?? ""} onChange={(value) => update("supportEmail", value)} />
        </SettingsSection>

        <SettingsSection icon={Palette} title="Diseño y marca" description="Personaliza los colores globales y el logo que verá toda la comunidad.">
          <ColorField label="Color primario" value={settings.primaryColor} onChange={(value) => update("primaryColor", value)} />
          <ColorField label="Color secundario" value={settings.secondaryColor} onChange={(value) => update("secondaryColor", value)} />
          <ColorField label="Color de acento y detalles" value={settings.accentColor} onChange={(value) => update("accentColor", value)} />
          <div className="rounded-lg border border-border p-4">
            <span className="mb-3 block text-sm font-semibold">Logo de la plataforma</span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-20 place-items-center overflow-hidden rounded-lg border border-border bg-surface-muted">{settings.logoUrl ? <img src={settings.logoUrl} alt="Vista previa del logo" className="size-full object-contain p-2" /> : <Image className="text-text-secondary" size={28} />}</span>
              <div className="flex flex-wrap gap-2"><label className="btn-secondary cursor-pointer"><Image size={16} />Seleccionar imagen<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={selectLogo} /></label>{settings.logoUrl && <button type="button" className="btn-secondary text-error" onClick={() => update("logoUrl", null)}><Trash2 size={16} />Quitar logo</button>}</div>
            </div>
            <p className="mt-3 text-xs text-text-secondary">PNG, JPG, WebP o SVG. Tamaño máximo: 1 MB.</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border md:col-span-2">
            <div className="flex items-center gap-3 p-4" style={{ backgroundColor: settings.primaryColor, color: "white" }}><span className="size-8 rounded-md" style={{ backgroundColor: settings.accentColor }} /><div><strong className="block">{settings.platformName}</strong><span className="text-xs opacity-80">Vista previa de la identidad visual</span></div><span className="ml-auto rounded-md px-3 py-2 text-xs font-semibold" style={{ backgroundColor: settings.secondaryColor }}>Acción secundaria</span></div>
          </div>
        </SettingsSection>

        <SettingsSection icon={ShieldCheck} title="Políticas de acceso" description="Se aplican inmediatamente a las contraseñas nuevas y los próximos ingresos.">
          <Field label="Máximo de sesiones activas por usuario" type="number" min="1" max="50" value={settings.maxActiveSessions} onChange={(value) => update("maxActiveSessions", value)} />
          <Field label="Longitud mínima de contraseña" type="number" min="8" max="72" value={settings.passwordMinLength} onChange={(value) => update("passwordMinLength", value)} />
          <Field label="Duración del enlace de recuperación (minutos)" type="number" min="10" max="1440" value={settings.passwordResetExpiryMinutes} onChange={(value) => update("passwordResetExpiryMinutes", value)} />
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
            <PolicyToggle label="Requerir una letra mayúscula" checked={settings.passwordRequireUppercase} onChange={(value) => update("passwordRequireUppercase", value)} />
            <PolicyToggle label="Requerir una letra minúscula" checked={settings.passwordRequireLowercase} onChange={(value) => update("passwordRequireLowercase", value)} />
            <PolicyToggle label="Requerir un número" checked={settings.passwordRequireNumber} onChange={(value) => update("passwordRequireNumber", value)} />
            <PolicyToggle label="Requerir un carácter especial" checked={settings.passwordRequireSpecial} onChange={(value) => update("passwordRequireSpecial", value)} />
          </div>
        </SettingsSection>

        <section className="panel flex items-start gap-4 p-6">
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${smtpConfigured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}><MailCheck size={22} /></span>
          <div>
            <h2 className="font-bold">Envío de correo</h2>
            <p className="mt-1 text-sm text-text-secondary">{smtpConfigured ? "SMTP está configurado. Las invitaciones y mensajes de recuperación pueden enviarse." : "SMTP no está configurado. Agrega las variables SMTP al archivo .env y recrea el contenedor del backend."}</p>
          </div>
        </section>

        <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? "Guardando…" : "Guardar configuración"}</button></div>
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

function ColorField({ label, value, onChange }) {
  return <label><span className="mb-2 block text-sm font-semibold">{label}</span><span className="flex items-center gap-3 rounded-md border border-border bg-surface p-2"><input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent p-0" /><input className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold uppercase outline-none" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} pattern="#[0-9A-Fa-f]{6}" required /></span></label>;
}

function PolicyToggle({ label, checked, onChange }) {
  return <label className="flex items-center gap-3 rounded-md border border-border p-4"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="text-sm font-semibold">{label}</span></label>;
}
