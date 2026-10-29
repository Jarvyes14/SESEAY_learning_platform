import { describe, expect, it } from "vitest";
import {
  defaultPlatformSettings,
  passwordPolicyErrors,
  publicPlatformSettings
} from "../../backend/src/services/platform-settings.service.js";

describe("Política de contraseñas", () => {
  it("acepta una contraseña que cumple todas las reglas configuradas", () => {
    expect(passwordPolicyErrors("Segura#2026ABC", defaultPlatformSettings)).toEqual([]);
  });

  it("rechaza una contraseña e informa todas las reglas incumplidas", () => {
    expect(passwordPolicyErrors("corta", defaultPlatformSettings)).toEqual(expect.arrayContaining([
      expect.stringContaining("12"),
      expect.stringContaining("mayúscula"),
      expect.stringContaining("número"),
      expect.stringContaining("especial")
    ]));
  });
});

describe("Configuración pública", () => {
  it("expone marca y política, pero no parámetros internos de sesión", () => {
    const result = publicPlatformSettings(defaultPlatformSettings);
    expect(result.primaryColor).toBe("#1F4E79");
    expect(result.passwordPolicy.minLength).toBe(12);
    expect(result).not.toHaveProperty("maxActiveSessions");
    expect(result).not.toHaveProperty("passwordResetExpiryMinutes");
  });
});
