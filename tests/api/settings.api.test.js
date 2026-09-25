import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "test-only-secret-with-at-least-32-characters";

const state = vi.hoisted(() => ({
  settings: {
    id: "global",
    platformName: "Integrity Learning",
    platformSubtitle: "Academia de Servicio Público",
    primaryColor: "#1F4E79",
    secondaryColor: "#2D6053",
    accentColor: "#AE792D",
    logoUrl: null,
    supportEmail: null,
    maxActiveSessions: 5,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    passwordResetExpiryMinutes: 60
  }
}));

const prismaMock = vi.hoisted(() => ({
  platformSettings: {
    upsert: vi.fn(async ({ update }) => {
      state.settings = { ...state.settings, ...update };
      return state.settings;
    })
  },
  session: { findMany: vi.fn(async () => []), updateMany: vi.fn(async () => ({ count: 0 })) },
  $transaction: vi.fn(async (operation) => typeof operation === "function" ? operation(prismaMock) : Promise.all(operation))
}));

vi.mock("../../backend/src/lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../../backend/src/middleware/auth.js", async () => {
  const { HttpError } = await import("../../backend/src/lib/http-error.js");
  return {
    getAuthToken: vi.fn(),
    optionalAuth: (req, _res, next) => next(),
    requireAuth: (req, _res, next) => {
      const role = req.get("x-test-role");
      if (!role) return next(new HttpError(401, "Authentication required"));
      req.user = { id: "test-user", role: { name: role } };
      return next();
    }
  };
});

const { app } = await import("../../backend/src/app.js");

describe("API de configuración y permisos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /health confirma que el servicio responde", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("GET /api/settings/public permite consultar la marca sin autenticación", async () => {
    const response = await request(app).get("/api/settings/public");
    expect(response.status).toBe(200);
    expect(response.body.data.primaryColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(response.body.data).not.toHaveProperty("maxActiveSessions");
  });

  it("GET /api/settings rechaza a quien no inició sesión", async () => {
    const response = await request(app).get("/api/settings");
    expect(response.status).toBe(401);
  });

  it("GET /api/settings rechaza al rol estudiante", async () => {
    const response = await request(app).get("/api/settings").set("x-test-role", "student");
    expect(response.status).toBe(403);
  });

  it("GET /api/settings permite al administrador de plataforma", async () => {
    const response = await request(app).get("/api/settings").set("x-test-role", "platform_admin");
    expect(response.status).toBe(200);
    expect(response.body.data.maxActiveSessions).toBe(5);
  });

  it("PATCH /api/settings impide al estudiante modificar la marca", async () => {
    const response = await request(app).patch("/api/settings").set("x-test-role", "student").send({ primaryColor: "#112233" });
    expect(response.status).toBe(403);
  });

  it("PATCH /api/settings rechaza colores inválidos aunque el rol tenga permiso", async () => {
    const response = await request(app).patch("/api/settings").set("x-test-role", "platform_admin").send({ primaryColor: "azul" });
    expect(response.status).toBe(400);
  });

  it("PATCH /api/settings permite al administrador modificar una configuración válida", async () => {
    const response = await request(app).patch("/api/settings").set("x-test-role", "platform_admin").send({ primaryColor: "#112233" });
    expect(response.status).toBe(200);
    expect(response.body.data.primaryColor).toBe("#112233");
  });
});
