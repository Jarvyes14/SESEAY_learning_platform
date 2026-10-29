import Pagination from "../components/Pagination.jsx";
import useUnsavedChanges from "../hooks/useUnsavedChanges.js";
import { can } from "../lib/permissions.js";
import { Building2, ChevronDown, ChevronUp, Clock3, MailCheck, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { roleLabel } from "../lib/labels.js";

const initialAuthorization = {
  email: "",
  role: "student",
  organizationId: ""
};

const accessDateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short"
});

function userToForm(user) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    organizationId: user.organization?.id ?? "",
    password: "",
    isActive: user.isActive
  };
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState("users");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [authorizedEmails, setAuthorizedEmails] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialAuthorization);
  const [organizationForm, setOrganizationForm] = useState({ name: "", institutionName: "", slug: "" });
  const [showAuthorizationForm, setShowAuthorizationForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState("");
  const [submitting, setSubmitting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userResult, authorizationResult, roleResult, organizationResult] = await Promise.all([
        api(`/users?page=${page}&limit=20&search=${encodeURIComponent(search)}${roleFilter ? `&role=${encodeURIComponent(roleFilter)}` : ""}`),
        api("/users/authorized-emails"),
        api("/users/roles"),
        api("/organizations")
      ]);
      setUsers(userResult.data);
      setMeta(userResult.meta);
      if (page > 1 && !userResult.data.length) setPage(page - 1);
      setAuthorizedEmails(authorizationResult.data);
      setRoles(roleResult.data);
      setOrganizations(organizationResult.data);
      setForm((current) =>
        roleResult.data.some((role) => role.name === current.role)
          ? current
          : { ...current, role: roleResult.data[0]?.name ?? "" }
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer); }, [load]);

  const dirty = Boolean(editForm && editingUser && JSON.stringify(editForm) !== JSON.stringify(userToForm(editingUser)));
  const confirmDiscard = useUnsavedChanges(dirty);

  async function authorizeEmail(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting("authorization");
    try {
      await api("/users/authorized-emails", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          organizationId: form.organizationId || null
        })
      });
      setMessage(`${form.email} ya puede crear una cuenta.`);
      setForm(initialAuthorization);
      setShowAuthorizationForm(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  async function createOrganization(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting("organization");
    try {
      await api("/organizations", {
        method: "POST",
        body: JSON.stringify(organizationForm)
      });
      setMessage("La organización se creó correctamente.");
      setOrganizationForm({ name: "", institutionName: "", slug: "" });
      setShowOrganizationForm(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  async function toggleUser(target) {
    setError("");
    setMessage("");
    setSubmitting(target.id);
    try {
      await api(`/users/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !target.isActive })
      });
      setMessage(`La cuenta de ${target.email} ahora está ${target.isActive ? "inactiva" : "activa"}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  async function removeAuthorization(target) {
    if (!window.confirm(`¿Quitar la autorización de registro de ${target.email}?`)) return;
    setError("");
    setMessage("");
    setSubmitting(target.id);
    try {
      await api(`/users/authorized-emails/${target.id}`, { method: "DELETE" });
      setMessage(`Se retiró la autorización de registro de ${target.email}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  function beginEdit(target) {
    if (!confirmDiscard()) return;
    setTab("users");
    setEditingUser(target);
    setEditForm(userToForm(target));
    setShowAuthorizationForm(false);
    setError("");
    setMessage("");
  }

  function cancelEdit(force = false) {
    if (force !== true && !confirmDiscard()) return;
    setEditingUser(null);
    setEditForm(null);
  }

  async function updateUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(editingUser.id);
    try {
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        role: editForm.role,
        organizationId: editForm.organizationId || null,
        ...(editForm.password ? { password: editForm.password } : {}),
        isActive: editForm.isActive
      };
      await api(`/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setMessage(`La cuenta de ${editForm.email} se actualizó correctamente.`);
      cancelEdit(true);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  async function deleteUser(target) {
    if (!window.confirm(`¿Eliminar la cuenta de ${target.email}? Esta acción no se puede deshacer.`)) return;
    setError("");
    setMessage("");
    setSubmitting(target.id);
    try {
      await api(`/users/${target.id}`, { method: "DELETE" });
      setMessage(`La cuenta de ${target.email} fue eliminada.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeading
        eyebrow="Identidad y acceso"
        title="Usuarios"
        description="Administra las cuentas, los registros autorizados y las organizaciones."
        actions={
          <>

            {tab === "organizations" && can(currentUser, "organizations.create") && (
              <button type="button" className="btn-secondary" onClick={() => { setTab("organizations"); setShowOrganizationForm((value) => !value); }}>
                <Building2 size={16} /> Nueva organización
              </button>
            )}
            <button type="button" disabled={!can(currentUser, "users.authorize")} className="btn-primary" onClick={() => { setTab("authorizations"); setShowAuthorizationForm((value) => !value); }}>
              <MailCheck size={16} /> Autorizar correo
            </button>
          </>
        }
      />
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      <div className="mt-5 grid grid-cols-3 gap-2 border-b border-border pb-3" role="tablist" aria-label="Administración de usuarios">{[["users", "Usuarios"], ["authorizations", "Registros autorizados"], ["organizations", "Organizaciones"]].map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={tab === key} className={`${tab === key ? "btn-primary" : "btn-secondary"} px-2 py-2 text-xs sm:text-sm`} onClick={() => setTab(key)}>{label}</button>)}</div>
      {tab === "users" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input-field" type="search" aria-label="Buscar usuarios" placeholder="Buscar por nombre o correo" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><select className="input-field" aria-label="Filtrar por rol" value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1); }}><option value="">Todos los roles</option>{roles.map(role => <option value={role.name} key={role.id}>{role.displayName}</option>)}</select></div>}
      {loading && <p role="status" className="mt-4 text-sm text-text-secondary">Cargando usuarios...</p>}
      {tab === "organizations" && showOrganizationForm && (
        <form onSubmit={createOrganization} className="panel mt-6 grid gap-4 p-6 md:grid-cols-3">
          <FormField label="Nombre de la organización" value={organizationForm.name} onChange={(value) => setOrganizationForm({ ...organizationForm, name: value })} />
          <FormField label="Nombre institucional en certificados" value={organizationForm.institutionName} onChange={(value) => setOrganizationForm({ ...organizationForm, institutionName: value })} />
          <FormField label="Identificador de URL" value={organizationForm.slug} onChange={(value) => setOrganizationForm({ ...organizationForm, slug: value })} />
          <button className="btn-primary md:col-span-3" type="submit" disabled={submitting !== ""}>
            <Plus size={16} /> {submitting === "organization" ? "Creando…" : "Crear organización"}
          </button>
        </form>
      )}

      {tab === "authorizations" && showAuthorizationForm && (
        <form onSubmit={authorizeEmail} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <FormField label="Correo electrónico" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <label>
            <span className="mb-2 block text-sm font-semibold">Rol</span>
            <select className="input-field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {roles.map((role) => <option key={role.id} value={role.name}>{role.displayName}</option>)}
            </select>
          </label>
          {currentUser.permissionScope !== "GLOBAL" ? (
            <div>
              <span className="mb-2 block text-sm font-semibold">Organización</span>
              <p className="input-field bg-surface-muted">{currentUser.organization?.name}</p>
            </div>
          ) : (
            <label>
              <span className="mb-2 block text-sm font-semibold">Organización</span>
              <select
                className="input-field"
                value={form.organizationId}
                onChange={(event) => setForm({ ...form, organizationId: event.target.value })}
                required={roles.find(role => role.name === form.role)?.scope === "ORGANIZATION"}
              >
                <option value="">Sin organización</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
          )}
          <p className="text-xs text-text-secondary md:col-span-2">Esto no crea una cuenta. La persona deberá usar exactamente este correo en la página Crear cuenta y elegir su contraseña.</p>
          <button className="btn-primary md:col-span-2" type="submit" disabled={submitting !== "" || !roles.length}>
            <MailCheck size={16} /> {submitting === "authorization" ? "Autorizando…" : "Autorizar correo"}
          </button>
        </form>
      )}

      {tab === "users" && editingUser && editForm && (
        <form onSubmit={updateUser} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <p className="eyebrow">Editar cuenta</p>
              <h2 className="mt-1 text-xl font-bold">{editingUser.firstName} {editingUser.lastName}</h2>
            </div>
            <button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-muted" onClick={cancelEdit} aria-label="Cerrar editor">
              <X size={18} />
            </button>
          </div>
          <FormField disabled={!can(currentUser, "users.edit")} label="Nombre" value={editForm.firstName} onChange={(value) => setEditForm({ ...editForm, firstName: value })} />
          <FormField disabled={!can(currentUser, "users.edit")} label="Apellidos" value={editForm.lastName} onChange={(value) => setEditForm({ ...editForm, lastName: value })} />
          <FormField disabled={!can(currentUser, "users.edit")} label="Correo electrónico" type="email" value={editForm.email} onChange={(value) => setEditForm({ ...editForm, email: value })} />
          <label>
            <span className="mb-2 block text-sm font-semibold">Rol</span>
            <select
              className="input-field"
              value={editForm.role}
              disabled={editingUser.id === currentUser.id || !can(currentUser, "users.assign_roles")}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
            >
              {roles.map((role) => <option key={role.id} value={role.name}>{role.displayName}</option>)}
            </select>
          </label>
          {currentUser.permissionScope !== "GLOBAL" ? (
            <div>
              <span className="mb-2 block text-sm font-semibold">Organización</span>
              <p className="input-field bg-surface-muted">{currentUser.organization?.name}</p>
            </div>
          ) : (
            <label>
              <span className="mb-2 block text-sm font-semibold">Organización</span>
              <select
                className="input-field"
                value={editForm.organizationId}
                disabled={editingUser.id === currentUser.id || !can(currentUser, "users.assign_roles")}
                required={roles.find(role => role.name === editForm.role)?.scope === "ORGANIZATION"}
                onChange={(event) => setEditForm({ ...editForm, organizationId: event.target.value })}
              >
                <option value="">Sin organización</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-3 rounded-md border border-border p-4 md:col-span-2">
            <input
              type="checkbox"
              checked={editForm.isActive}
              disabled={editingUser.id === currentUser.id || !can(currentUser, "users.status")}
              onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })}
            />
            <span>
              <strong className="block text-sm">Cuenta activa</strong>
              <span className="text-xs text-text-secondary">Las personas inactivas no pueden iniciar sesión.</span>
            </span>
          </label>
          {can(currentUser, "users.reset_password") && <FormField label="Nueva contraseña temporal (opcional)" type="password" required={false} minLength={8} maxLength={72} autoComplete="new-password" value={editForm.password} onChange={(password) => setEditForm({ ...editForm, password })} />}
          <p className="text-xs text-text-secondary md:col-span-2">Cambiar el correo, contraseña, rol, organización o estado cerrará las sesiones activas de la persona.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">
            <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={submitting !== ""}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting !== ""}>
              {submitting === editingUser.id ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {tab === "authorizations" && <section className="mt-8">
        <h2 className="text-xl font-bold">Correos autorizados ({authorizedEmails.length})</h2>
        {authorizedEmails.length ? (
          <div className="table-scroll mt-4 rounded-lg border border-border bg-surface" tabIndex={0} role="region" aria-label="Tabla de cuentas y accesos">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-text-secondary">
                <tr><th className="px-5 py-4">Correo</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Organización</th><th className="px-5 py-4">Registro</th><th className="px-5 py-4">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {authorizedEmails.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-4 font-semibold">{entry.email}</td>
                    <td className="px-5 py-4">{entry.roleDisplayName ?? roleLabel(entry.role)}</td>
                    <td className="px-5 py-4 text-text-secondary">{entry.organization?.name ?? "Ninguna"}</td>
                    <td className="px-5 py-4">
                      <span className={entry.registeredAt ? "text-success" : "text-warning"}>
                        {entry.registeredAt ? "Cuenta creada" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="rounded-md border border-border p-2 text-text-secondary hover:text-error disabled:opacity-60"
                        onClick={() => removeAuthorization(entry)}
                        title="Eliminar autorización de registro"
                        disabled={submitting !== "" || !can(currentUser, "users.authorize")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No hay correos autorizados" description="Autoriza un correo para que su propietario pueda crear una cuenta." /></div>
        )}
      </section>}

      {tab === "organizations" && <section className="mt-9">
        <h2 className="text-xl font-bold">Organizaciones ({organizations.length})</h2>
        {organizations.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <article key={organization.id} className="panel p-5">
                <Building2 className="text-primary" />
                <h3 className="mt-3 font-bold">{organization.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{organization.institutionName || "Usa el nombre institucional de la plataforma"}</p>
                <p className="mt-4 text-xs text-text-secondary">{organization._count.users} personas · {organization._count.courses} cursos</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No hay organizaciones" description="Crea una organización antes de asignar administradores o certificados institucionales." /></div>
        )}
      </section>}

      {tab === "users" && <section className="mt-9">
        <h2 className="text-xl font-bold">Personas usuarias ({users.length})</h2>
        <div className="mt-4 space-y-3 md:hidden">{users.map(target => <article className="panel p-4" key={target.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{target.firstName} {target.lastName}</h3><p className="break-all text-xs text-text-secondary">{target.email}</p></div><StatusBadge value={target.isActive ? "ACTIVE" : "ARCHIVED"} /></div><p className="mt-2 text-sm">{target.roleDisplayName ?? roleLabel(target.role)} · {target.organization?.name ?? "Sin organización"}</p><div className="mt-3 flex flex-wrap gap-2"><button className="btn-secondary" disabled={!["users.edit", "users.assign_roles", "users.status", "users.reset_password"].some(key => can(currentUser, key))} onClick={() => beginEdit(target)}>Editar</button>{can(currentUser, "users.status") && target.id !== currentUser.id && <button className="btn-secondary" disabled={submitting !== ""} onClick={() => toggleUser(target)}>{target.isActive ? "Desactivar" : "Activar"}</button>}{can(currentUser, "users.delete") && target.id !== currentUser.id && <button className="btn-secondary text-error" disabled={submitting !== ""} onClick={() => deleteUser(target)}>Eliminar</button>}</div></article>)}</div>
        {loading ? null : users.length ? (
          <div className="table-scroll hidden md:block mt-4 rounded-lg border border-border bg-surface" tabIndex={0} role="region" aria-label="Tabla de cuentas y accesos">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-text-secondary">
                <tr><th className="px-5 py-4">Persona</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Organización</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Último acceso</th><th className="px-5 py-4">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((target) => (
                  <Fragment key={target.id}>
                  <tr>
                    <td className="px-5 py-4"><strong>{target.firstName} {target.lastName}</strong><span className="block text-xs text-text-secondary">{target.email}</span></td>
                    <td className="px-5 py-4">{target.roleDisplayName ?? roleLabel(target.role)}</td>
                    <td className="px-5 py-4 text-text-secondary">{target.organization?.name ?? "Ninguna"}</td>
                    <td className="px-5 py-4"><StatusBadge value={target.isActive ? "ACTIVE" : "ARCHIVED"} /></td>
                    <td className="px-5 py-4">
                      {can(currentUser, "users.sessions.view") && target.lastAccessAt ? (
                        <div>
                          <span className="block text-sm">{accessDateFormatter.format(new Date(target.lastAccessAt))}</span>
                          <button
                            type="button"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                            onClick={() => setExpandedUserId((current) => current === target.id ? "" : target.id)}
                          >
                            {expandedUserId === target.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {expandedUserId === target.id ? "Ocultar historial" : "Ver últimos accesos"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary">Nunca ha ingresado</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-60"
                          onClick={() => beginEdit(target)}
                          title="Editar persona"
                          disabled={submitting !== "" || !["users.edit", "users.assign_roles", "users.status"].some(key => can(currentUser, key))}
                        >
                          <Pencil size={16} />
                        </button>
                        {can(currentUser, "users.status") && currentUser.id !== target.id && (
                          <button
                            type="button"
                            className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-60"
                            onClick={() => toggleUser(target)}
                            title={target.isActive ? "Desactivar cuenta" : "Activar cuenta"}
                            disabled={submitting !== ""}
                          >
                            <Power size={16} />
                          </button>
                        )}
                        {can(currentUser, "users.delete") && can(currentUser, "users.status") && currentUser.id !== target.id && (
                          <button type="button" className="rounded-md border border-border p-2 text-text-secondary hover:text-error disabled:opacity-60" onClick={() => deleteUser(target)} title="Eliminar persona" disabled={submitting !== ""}><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedUserId === target.id && (
                    <tr className="bg-surface-muted/50">
                      <td colSpan="6" className="px-5 py-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Últimos accesos registrados</p>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {target.recentAccesses.map((access) => (
                            <div key={access.id} className="rounded-md border border-border bg-surface p-3">
                              <p className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={14} /> {accessDateFormatter.format(new Date(access.lastSeenAt))}</p>
                              <p className="mt-1 text-xs text-text-secondary">Inicio: {accessDateFormatter.format(new Date(access.signedInAt))}</p>
                              <p className="mt-1 text-xs text-text-secondary">IP: {access.ipAddress || "No disponible"}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No hay personas usuarias" description="Las cuentas registradas aparecerán cuando una persona autorizada cree la suya." /></div>
        )}
        <Pagination meta={meta} onChange={setPage} />
      </section>}
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", required = true, ...inputProps }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input className="input-field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...inputProps} />
    </label>
  );
}
