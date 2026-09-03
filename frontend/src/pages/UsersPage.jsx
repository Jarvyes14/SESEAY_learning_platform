import { Building2, Pencil, Plus, Power, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import DisabledButton from "../components/DisabledButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const initialUser = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "student",
  organizationId: ""
};

function userToForm(user) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    role: user.role,
    organizationId: user.organization?.id ?? "",
    isActive: user.isActive
  };
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialUser);
  const [organizationForm, setOrganizationForm] = useState({ name: "", institutionName: "", slug: "" });
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [userResult, roleResult, organizationResult] = await Promise.all([
        api("/users?limit=100"),
        api("/users/roles"),
        api("/organizations")
      ]);
      setUsers(userResult.data);
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
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting("user");
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          organizationId: form.organizationId || null
        })
      });
      setMessage("User created successfully.");
      setForm(initialUser);
      setShowUserForm(false);
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
      setMessage("Organization created successfully.");
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
      setMessage(`The account for ${target.email} is now ${target.isActive ? "inactive" : "active"}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  function beginEdit(target) {
    setEditingUser(target);
    setEditForm(userToForm(target));
    setShowUserForm(false);
    setError("");
    setMessage("");
  }

  function cancelEdit() {
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
        isActive: editForm.isActive
      };
      if (editForm.password) payload.password = editForm.password;

      await api(`/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setMessage(`The account for ${editForm.email} was updated.`);
      cancelEdit();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting("");
    }
  }

  async function deleteUser(target) {
    if (!window.confirm(`Delete ${target.email}? This cannot be undone.`)) return;
    setError("");
    setMessage("");
    setSubmitting(target.id);
    try {
      await api(`/users/${target.id}`, { method: "DELETE" });
      setMessage(`The account for ${target.email} was deleted.`);
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
        eyebrow="Identity and access"
        title="Users and organizations"
        description="Every row shown here comes from the database. Create accounts before assigning courses or enrolling students."
        actions={
          <>
            <DisabledButton>Bulk CSV import</DisabledButton>
            {["platform_admin", "government_admin"].includes(currentUser.role) && (
              <button type="button" className="btn-secondary" onClick={() => setShowOrganizationForm((value) => !value)}>
                <Building2 size={16} /> New organization
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => setShowUserForm((value) => !value)}>
              <UserPlus size={16} /> New user
            </button>
          </>
        }
      />
      {message && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{message}</p>}
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}

      {showOrganizationForm && (
        <form onSubmit={createOrganization} className="panel mt-6 grid gap-4 p-6 md:grid-cols-3">
          <FormField label="Organization name" value={organizationForm.name} onChange={(value) => setOrganizationForm({ ...organizationForm, name: value })} />
          <FormField label="Certificate institution name" value={organizationForm.institutionName} onChange={(value) => setOrganizationForm({ ...organizationForm, institutionName: value })} />
          <FormField label="Slug" value={organizationForm.slug} onChange={(value) => setOrganizationForm({ ...organizationForm, slug: value })} />
          <button className="btn-primary md:col-span-3" type="submit" disabled={submitting !== ""}>
            <Plus size={16} /> {submitting === "organization" ? "Creating…" : "Create organization"}
          </button>
        </form>
      )}

      {showUserForm && (
        <form onSubmit={createUser} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <FormField label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
          <FormField label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} />
          <FormField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <FormField label="Temporary password" type="password" minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          <label>
            <span className="mb-2 block text-sm font-semibold">Role</span>
            <select className="input-field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {roles.map((role) => <option key={role.id} value={role.name}>{role.displayName}</option>)}
            </select>
          </label>
          {currentUser.role === "organization_admin" ? (
            <div>
              <span className="mb-2 block text-sm font-semibold">Organization</span>
              <p className="input-field bg-surface-muted">{currentUser.organization?.name}</p>
            </div>
          ) : (
            <label>
              <span className="mb-2 block text-sm font-semibold">Organization</span>
              <select
                className="input-field"
                value={form.organizationId}
                onChange={(event) => setForm({ ...form, organizationId: event.target.value })}
                required={form.role === "organization_admin"}
              >
                <option value="">No organization</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
          )}
          <p className="text-xs text-text-secondary md:col-span-2">Passwords must contain between 8 and 72 characters. Share temporary credentials through a secure channel.</p>
          <button className="btn-primary md:col-span-2" type="submit" disabled={submitting !== "" || !roles.length}>
            <UserPlus size={16} /> {submitting === "user" ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      {editingUser && editForm && (
        <form onSubmit={updateUser} className="panel mt-6 grid gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <p className="eyebrow">Edit account</p>
              <h2 className="mt-1 text-xl font-bold">{editingUser.firstName} {editingUser.lastName}</h2>
            </div>
            <button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-muted" onClick={cancelEdit} aria-label="Close editor">
              <X size={18} />
            </button>
          </div>
          <FormField label="First name" value={editForm.firstName} onChange={(value) => setEditForm({ ...editForm, firstName: value })} />
          <FormField label="Last name" value={editForm.lastName} onChange={(value) => setEditForm({ ...editForm, lastName: value })} />
          <FormField label="Email" type="email" value={editForm.email} onChange={(value) => setEditForm({ ...editForm, email: value })} />
          <FormField
            label="New password (optional)"
            type="password"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            required={false}
            value={editForm.password}
            onChange={(value) => setEditForm({ ...editForm, password: value })}
          />
          <label>
            <span className="mb-2 block text-sm font-semibold">Role</span>
            <select
              className="input-field"
              value={editForm.role}
              disabled={editingUser.id === currentUser.id}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
            >
              {roles.map((role) => <option key={role.id} value={role.name}>{role.displayName}</option>)}
            </select>
          </label>
          {currentUser.role === "organization_admin" ? (
            <div>
              <span className="mb-2 block text-sm font-semibold">Organization</span>
              <p className="input-field bg-surface-muted">{currentUser.organization?.name}</p>
            </div>
          ) : (
            <label>
              <span className="mb-2 block text-sm font-semibold">Organization</span>
              <select
                className="input-field"
                value={editForm.organizationId}
                disabled={editingUser.id === currentUser.id}
                required={editForm.role === "organization_admin"}
                onChange={(event) => setEditForm({ ...editForm, organizationId: event.target.value })}
              >
                <option value="">No organization</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-3 rounded-md border border-border p-4 md:col-span-2">
            <input
              type="checkbox"
              checked={editForm.isActive}
              disabled={editingUser.id === currentUser.id}
              onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })}
            />
            <span>
              <strong className="block text-sm">Active account</strong>
              <span className="text-xs text-text-secondary">Inactive users cannot sign in.</span>
            </span>
          </label>
          <p className="text-xs text-text-secondary md:col-span-2">Changing the email, password, role, organization, or status closes the user's active sessions.</p>
          <div className="flex justify-end gap-3 md:col-span-2">
            <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={submitting !== ""}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting !== ""}>
              {submitting === editingUser.id ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Organizations ({organizations.length})</h2>
        {organizations.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <article key={organization.id} className="panel p-5">
                <Building2 className="text-primary" />
                <h3 className="mt-3 font-bold">{organization.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{organization.institutionName || "Uses platform institution name"}</p>
                <p className="mt-4 text-xs text-text-secondary">{organization._count.users} users · {organization._count.courses} courses</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No organizations" description="Create an organization before assigning organization administrators or institution-specific certificates." /></div>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-xl font-bold">Users ({users.length})</h2>
        {users.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-text-secondary">
                <tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Organization</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((target) => (
                  <tr key={target.id}>
                    <td className="px-5 py-4"><strong>{target.firstName} {target.lastName}</strong><span className="block text-xs text-text-secondary">{target.email}</span></td>
                    <td className="px-5 py-4 capitalize">{target.role.replaceAll("_", " ")}</td>
                    <td className="px-5 py-4 text-text-secondary">{target.organization?.name ?? "None"}</td>
                    <td className="px-5 py-4"><StatusBadge value={target.isActive ? "ACTIVE" : "ARCHIVED"} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-60"
                          onClick={() => beginEdit(target)}
                          title="Edit user"
                          disabled={submitting !== ""}
                        >
                          <Pencil size={16} />
                        </button>
                        {currentUser.id !== target.id && (
                          <button
                            type="button"
                            className="rounded-md border border-border p-2 text-text-secondary hover:text-primary disabled:opacity-60"
                            onClick={() => toggleUser(target)}
                            title={target.isActive ? "Deactivate account" : "Activate account"}
                            disabled={submitting !== ""}
                          >
                            <Power size={16} />
                          </button>
                        )}
                        {currentUser.role === "platform_admin" && currentUser.id !== target.id && (
                          <button type="button" className="rounded-md border border-border p-2 text-text-secondary hover:text-error disabled:opacity-60" onClick={() => deleteUser(target)} title="Delete user" disabled={submitting !== ""}><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No users" description="Create the first instructor or student account to begin using the learning workflows." /></div>
        )}
      </section>
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
