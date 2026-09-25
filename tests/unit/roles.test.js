import { describe, expect, it, vi } from "vitest";
import { allowRoles } from "../../backend/src/middleware/roles.js";

function execute(role) {
  const next = vi.fn();
  allowRoles("platform_admin")(
    role ? { user: { role: { name: role } } } : {},
    {},
    next
  );
  return next.mock.calls[0]?.[0];
}

describe("Control de acceso por rol", () => {
  it("permite al administrador de plataforma continuar", () => {
    expect(execute("platform_admin")).toBeUndefined();
  });

  it("niega con 403 a un estudiante que intenta una acción administrativa", () => {
    const error = execute("student");
    expect(error.status).toBe(403);
  });

  it("niega con 401 cuando no existe una sesión autenticada", () => {
    const error = execute(null);
    expect(error.status).toBe(401);
  });
});
