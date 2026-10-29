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
  },
  certificateTemplates: []
}));

const prismaMock = vi.hoisted(() => ({
  brandAsset: { create: vi.fn(async () => ({ id: "22222222-2222-4222-8222-222222222222" })) },
  platformSettings: {
    upsert: vi.fn(async ({ update }) => {
      state.settings = { ...state.settings, ...update };
      return state.settings;
    })
  },
  certificateTemplate: {
    findMany: vi.fn(async () => state.certificateTemplates),
    findUnique: vi.fn(async ({ where }) => state.certificateTemplates.find((template) => template.id === where.id) ?? null),
    findFirst: vi.fn(async ({ where }) => state.certificateTemplates.find((template) => template.id === where.id) ?? null),
    create: vi.fn(async ({ data }) => {
      const template = { id: "11111111-1111-4111-8111-111111111111", ...data, createdAt: new Date(), updatedAt: new Date() };
      state.certificateTemplates.unshift(template);
      return template;
    }),
    update: vi.fn(async ({ where, data }) => {
      const index = state.certificateTemplates.findIndex((template) => template.id === where.id);
      state.certificateTemplates[index] = { ...state.certificateTemplates[index], ...data, updatedAt: new Date() };
      return state.certificateTemplates[index];
    }),
    delete: vi.fn(async ({ where }) => {
      const template = state.certificateTemplates.find((item) => item.id === where.id);
      state.certificateTemplates = state.certificateTemplates.filter((item) => item.id !== where.id);
      return template;
    })
  },
  role: {
    findUnique: vi.fn(async ({ where }) => ({
      id: where.id ?? "22222222-2222-4222-8222-222222222222",
      name: where.name ?? "student",
      displayName: "Estudiante"
    }))
  },
  course: {
    count: vi.fn(async () => 0),
    create: vi.fn(async ({ data }) => ({ id: "33333333-3333-4333-8333-333333333333", ...data })),
    updateMany: vi.fn(async () => ({ count: 0 }))
  },
  enrollment: { findMany: vi.fn(async () => []) },
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

  it("GET /api/grades/overview rechaza la consulta sin sesión", async () => {
    const response = await request(app).get("/api/grades/overview");
    expect(response.status).toBe(401);
  });

  it("GET /api/grades/overview limita al estudiante a sus propias inscripciones", async () => {
    const response = await request(app).get("/api/grades/overview").set("x-test-role", "student");
    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: "test-user" }
    }));
  });

  it("GET /api/certificates/templates impide al estudiante abrir el diseñador", async () => {
    const response = await request(app).get("/api/certificates/templates").set("x-test-role", "student");
    expect(response.status).toBe(403);
  });

  it("GET /api/certificates/templates permite al administrador consultar las plantillas", async () => {
    const response = await request(app).get("/api/certificates/templates").set("x-test-role", "platform_admin");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("POST /api/certificates/templates rechaza una plantilla sin imagen válida", async () => {
    const response = await request(app)
      .post("/api/certificates/templates")
      .set("x-test-role", "platform_admin")
      .send({ ...validCertificateTemplate, backgroundImage: "https://example.org/certificate.png" });
    expect(response.status).toBe(400);
  });

  it("POST /api/certificates/templates permite crear una plantilla independiente", async () => {
    const response = await request(app)
      .post("/api/certificates/templates")
      .set("x-test-role", "platform_admin")
      .send(validCertificateTemplate);
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe("Certificado institucional");
    expect(response.body.data).not.toHaveProperty("courseId");
  });

  it("POST /api/courses permite crear un curso sin certificado", async () => {
    const response = await request(app)
      .post("/api/courses")
      .set("x-test-role", "platform_admin")
      .send({ ...validCourse, certificateTemplateId: null });
    expect(response.status).toBe(201);
    expect(response.body.data.certificateTemplateId).toBeNull();
    expect(response.body.data.certificateEnabled).toBe(false);
  });

  it("POST /api/courses habilita el certificado al seleccionar una plantilla", async () => {
    const templateId = "44444444-4444-4444-8444-444444444444";
    state.certificateTemplates = [{ id: templateId, createdById: "test-user" }];
    const response = await request(app)
      .post("/api/courses")
      .set("x-test-role", "platform_admin")
      .send({ ...validCourse, title: "Curso certificado", certificateTemplateId: templateId });
    expect(response.status).toBe(201);
    expect(response.body.data.certificateTemplateId).toBe(templateId);
    expect(response.body.data.certificateEnabled).toBe(true);
  });
});

const validCertificateTemplate = {
  name: "Certificado institucional",
  backgroundImage: "data:image/png;base64,iVBORw0KGgo=",
  nameX: 50,
  nameY: 52,
  nameWidth: 60,
  fontSize: 42,
  textColor: "#1F2937",
  fontFamily: "serif"
};

const validCourse = {
  title: "Curso opcional",
  description: "Curso de prueba con una descripción válida.",
  category: "Pruebas",
  difficulty: "BEGINNER",
  durationMinutes: 60,
  passingGrade: 70,
  status: "DRAFT",
  certificateEnabled: false
};
