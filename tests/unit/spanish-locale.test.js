import { describe, expect, it, vi } from "vitest";
import { z } from "../../backend/node_modules/zod/index.js";
import "../../backend/src/lib/validation-i18n.js";
import { spanishValidationMessage } from "../../frontend/src/lib/spanish-validation.js";
import { difficultyLabel } from "../../frontend/src/lib/labels.js";

const mail = vi.hoisted(() => ({ sendMail: vi.fn(async () => ({})) }));
vi.mock("../../backend/node_modules/nodemailer/lib/nodemailer.js", () => ({ default: { createTransport: () => mail } }));
vi.mock("../../backend/src/config/env.js", () => ({ env: { CLIENT_URL: "http://localhost:3000", SMTP_HOST: "mailpit", SMTP_PORT: 1025, SMTP_FROM: "plataforma@example.test" } }));
import { sendInvitationEmail, sendPasswordResetEmail } from "../../backend/src/services/email.service.js";

describe("Validaciones en español", () => {
  it("traduce campos obligatorios, formatos y límites sin exponer códigos internos", () => {
    const result = z.object({ email: z.string().email(), score: z.number().min(0), state: z.enum(["ACTIVE", "COMPLETED"]), title: z.string() }).safeParse({ email: "incorrecto", score: -1, state: "OTHER" });
    const errors = result.error.flatten().fieldErrors;
    expect(errors.email[0]).toBe("Ingresa un correo electrónico válido.");
    expect(errors.score[0]).toBe("El valor debe ser mayor o igual que 0.");
    expect(errors.state[0]).toBe("Selecciona una opción válida.");
    expect(errors.title[0]).toBe("Este campo es obligatorio.");
  });

  it("produce mensajes de formulario en español para correos, listas y números", () => {
    expect(spanishValidationMessage({ type: "email", validity: { typeMismatch: true } })).toBe("Ingresa un correo electrónico válido.");
    expect(spanishValidationMessage({ type: "select-one", validity: { valueMissing: true } })).toBe("Selecciona una opción.");
    expect(spanishValidationMessage({ max: "100", validity: { rangeOverflow: true } })).toBe("El valor debe ser menor o igual que 100.");
  });

  it("traduce la dificultad sin cambiar los valores del catálogo", () => {
    expect(difficultyLabel("BEGINNER")).toBe("Principiante");
    expect(difficultyLabel("INTERMEDIATE")).toBe("Intermedio");
    expect(difficultyLabel("ADVANCED")).toBe("Avanzado");
    expect(difficultyLabel(null)).toBe("Sin especificar");
  });
});

describe("Correos de la plataforma", () => {
  const user = { firstName: "<Ana>", email: "ana@example.test" };
  const settings = { platformName: "Aprendizaje SEAY", passwordResetExpiryMinutes: 30 };

  it("redacta la invitación en español y conserva el escape de HTML", async () => {
    await sendInvitationEmail({ user, temporaryPassword: "Prueba#123456", settings });
    const message = mail.sendMail.mock.calls.at(-1)[0];
    expect(message.subject).toBe("Tu acceso a Aprendizaje SEAY");
    expect(message.text).toContain("Contraseña temporal:");
    expect(message.html).toContain("Hola, &lt;Ana&gt;:");
    expect(message.html).toContain("Iniciar sesión");
  });

  it("redacta la recuperación en español y mantiene su enlace de un solo uso", async () => {
    await sendPasswordResetEmail({ user, token: "token/prueba", settings });
    const message = mail.sendMail.mock.calls.at(-1)[0];
    expect(message.subject).toBe("Restablece tu contraseña de Aprendizaje SEAY");
    expect(message.text).toContain("Este enlace vence en 30 minutos.");
    expect(message.html).toContain("reset-password?token=token%2Fprueba");
    expect(message.html).toContain("Restablecer contraseña");
  });
});
