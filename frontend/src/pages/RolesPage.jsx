import useDialog from "../hooks/useDialog.js";
import useUnsavedChanges from "../hooks/useUnsavedChanges.js";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import PageHeading from "../components/PageHeading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { can } from "../lib/permissions.js";

const scopes = { OWN: "Registros propios", ORGANIZATION: "Mi organización", GLOBAL: "Toda la plataforma" };
const scopeOrder = ["OWN", "ORGANIZATION", "GLOBAL"];
const blank = { displayName: "", description: "", scope: "OWN", permissions: [] };

export default function RolesPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [roleResult, permissionsResult] = await Promise.all([api("/roles"), api("/roles/permissions")]);
      setRoles(roleResult.data);
      setCatalog(permissionsResult.data);
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const editorOpen = editing !== null;
  const original = editing?.id ? { displayName: editing.displayName, description: editing.description ?? "", scope: editing.scope, permissions: editing.permissions } : blank;
  const dirty = editorOpen && JSON.stringify(form) !== JSON.stringify(original);
  const confirmDiscard = useUnsavedChanges(dirty);
  const closeEditor = () => { if (!busy && confirmDiscard()) setEditing(null); };
  const dialogRef = useDialog(editorOpen, closeEditor);
  const readOnly = busy || (editing?.id ? !can(user, "roles.edit") || !editing.canManage : !can(user, "roles.create"));

  function open(role) {
    setEditing(role ?? {});
    setForm(role ? { displayName: role.displayName, description: role.description ?? "", scope: role.scope, permissions: role.permissions } : blank);
    setQuery("");
    setError("");
    setMessage("");
  }
  function toggle(keys, checked) {
    const selected = new Set(form.permissions);
    if (checked) {
      keys.filter(key => can(user, key)).forEach(key => selected.add(key));
      for (const key of selected) for (const dependency of catalog.find(item => item.key === key)?.requires ?? []) selected.add(dependency);
    } else {
      keys.forEach(key => selected.delete(key));
      let changed = true;
      while (changed) {
        changed = false;
        for (const key of selected) if (catalog.find(item => item.key === key)?.requires.some(dependency => !selected.has(dependency))) { selected.delete(key); changed = true; }
      }
    }
    setForm({ ...form, permissions: [...selected] });
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editing.id ? `/roles/${editing.id}` : "/roles", { method: editing.id ? "PATCH" : "POST", body: JSON.stringify(form) });
      setMessage(editing.id ? "El rol y sus permisos se actualizaron. Los cambios se aplican a sus usuarios." : "El rol se creó. Ya puedes asignarlo desde Usuarios.");
      setEditing(null);
      await load();
      await refreshUser();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function remove(role) {
    if (!window.confirm(`¿Eliminar el rol «${role.displayName}»?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/roles/${role.id}`, { method: "DELETE" });
      setMessage("El rol se eliminó correctamente.");
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  const groups = [...new Set(catalog.map(item => item.group))];
  const visible = catalog.filter(item => `${item.label} ${item.description} ${item.group}`.toLocaleLowerCase("es-MX").includes(query.toLocaleLowerCase("es-MX")));
  return <div className="container-page py-10">
    <PageHeading eyebrow="Administración de acceso" title="Roles y permisos" description="Define qué funciones puede consultar o modificar cada rol y sobre qué registros puede actuar." actions={can(user, "roles.create") && <button className="btn-primary" onClick={() => open()}><Plus size={17} />Crear rol</button>} />
    {error && <p role="alert" className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
    {loading && <p role="status" className="mt-5 text-text-secondary">Cargando roles...</p>}
    <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {roles.map(role => {
        const reason = role.isSystem ? "Los roles del sistema están protegidos" : role._count.users ? "Reasigna primero los usuarios de este rol" : role._count.authorizedEmails || role._count.accessibleCourses ? "Retira el rol de correos autorizados y audiencias de cursos" : "Eliminar rol";
        return <article key={role.id} className="panel flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-3"><ShieldCheck className="shrink-0 text-primary" /><span className="rounded bg-surface-muted px-2 py-1 text-xs">{role.isSystem ? "Del sistema" : "Personalizado"}</span></div>
          <h2 className="mt-4 break-words text-xl font-bold">{role.displayName}</h2>
          <p className="mt-2 break-words text-sm text-text-secondary">{role.description || "Sin descripción"}</p>
          <dl className="my-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-text-secondary">Usuarios</dt><dd className="font-bold">{role._count.users}</dd></div><div><dt className="text-text-secondary">Alcance</dt><dd className="font-semibold">{scopes[role.scope]}</dd></div></dl>
          <div className="mt-auto flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => open(role)}><Pencil size={15} />{can(user, "roles.edit") && role.canManage ? "Editar" : "Ver permisos"}</button>
            {can(user, "roles.delete") && role.canManage && <button className="btn-secondary text-error" disabled={busy || role.isSystem || Boolean(role._count.users || role._count.authorizedEmails || role._count.accessibleCourses)} title={reason} onClick={() => remove(role)}><Trash2 size={15} />Eliminar</button>}
          </div>
          {role._count.users > 0 && role.canManage && <p className="mt-3 text-xs text-text-secondary">Puedes editarlo. Para eliminarlo, reasigna sus usuarios.</p>}
        </article>;
      })}
    </div>
    {editing && <div ref={dialogRef} className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-overlay/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="role-editor-title">
      <form onSubmit={save} className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-surface shadow-panel sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface p-5"><div><h2 id="role-editor-title" className="text-2xl font-bold">{editing.id ? editing.displayName : "Crear rol personalizado"}</h2></div><button type="button" className="btn-secondary p-2" disabled={busy} onClick={closeEditor} aria-label="Cerrar editor de rol"><X size={20} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]" tabIndex={0} role="region" aria-label="Configuración y permisos del rol">
        {error && <p role="alert" className="mx-5 mt-4 text-sm text-error">{error}</p>}
        <fieldset  className="min-w-0 space-y-3 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="mb-2 block text-sm font-semibold">Nombre del rol</span><input disabled={readOnly} className="input-field" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} minLength={2} maxLength={100} required /></label>
            <label><span className="mb-2 block text-sm font-semibold">Alcance de acceso</span><select disabled={readOnly} className="input-field" value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}>{Object.entries(scopes).map(([key, label]) => <option key={key} value={key} disabled={scopeOrder.indexOf(key) > scopeOrder.indexOf(user.permissionScope)}>{label}</option>)}</select></label>
            <details className="md:col-span-2"><summary className="cursor-pointer text-sm font-semibold text-primary">Descripción opcional</summary><textarea aria-label="Descripción del rol" disabled={readOnly} className="input-field mt-2" value={form.description} maxLength={1000} onChange={event => setForm({ ...form, description: event.target.value })} /></details>
          </div>
          <details className="rounded-md bg-surface-muted p-3 text-sm text-text-secondary"><summary className="cursor-pointer font-semibold">Alcance y permisos</summary><p className="mt-2">El alcance limita los registros que puede gestionar. Los permisos necesarios para cada función se seleccionan automáticamente. Si retiras uno, se desmarcan las funciones que dependen de el.</p></details>
          <div className="grid grid-cols-2 gap-2"><button type="button" className="btn-secondary px-2 py-2 text-xs" disabled={readOnly} onClick={() => toggle(catalog.map(item => item.key), true)}>Seleccionar disponibles</button><button type="button" className="btn-secondary" disabled={readOnly} onClick={() => toggle(catalog.map(item => item.key), false)}>Quitar todos</button></div>
          <label className="sticky top-0 z-10 block bg-surface py-2"><span className="mb-2 block text-sm font-semibold">Buscar permisos</span><input className="input-field" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por función o módulo" /></label>
          <div className="space-y-5">{groups.map(group => {
            const items = visible.filter(item => item.group === group);
            if (!items.length) return null;
            const keys = items.filter(item => can(user, item.key)).map(item => item.key);
            return <section key={group} className="overflow-hidden rounded-lg border border-border"><div className="flex flex-wrap items-center justify-between gap-3 bg-surface-muted px-4 py-3"><h3 className="font-bold">{group}</h3><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={keys.length > 0 && keys.every(key => form.permissions.includes(key))} disabled={readOnly || !keys.length} onChange={event => toggle(keys, event.target.checked)} />Seleccionar grupo</label></div><div className="grid gap-0 md:grid-cols-2">{items.map(item => <label key={item.key} className="flex min-w-0 items-start gap-3 border-t border-border p-4"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={form.permissions.includes(item.key)} disabled={readOnly || !can(user, item.key)} onChange={event => toggle([item.key], event.target.checked)} /><span className="min-w-0"><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{item.description}</span>{!can(user, item.key) && <span className="mt-1 block text-xs text-warning">No puedes delegar este permiso</span>}</span></label>)}</div></section>;
          })}{!visible.length && <p className="text-sm text-text-secondary">No se encontraron permisos.</p>}</div>
        </fieldset>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-surface p-5">{dirty && <span className="mr-auto text-xs text-warning">Cambios sin guardar</span>}<button type="button" className="btn-secondary" disabled={busy} onClick={closeEditor}>Cerrar</button>{(editing.id ? can(user, "roles.edit") && editing.canManage : can(user, "roles.create")) && <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Guardando…" : editing.id ? "Guardar cambios" : "Crear rol"}</button>}</div>
      </form>
    </div>}
  </div>;
}
