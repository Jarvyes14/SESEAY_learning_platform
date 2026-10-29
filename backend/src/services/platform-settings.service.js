import { randomInt } from "node:crypto";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { publicBranding } from "../lib/branding.js";

export const defaultPlatformSettings = {
  id: "global",
  platformName: "Plataforma de aprendizaje",
  platformSubtitle: "Academia de Servicio Público",
  primaryColor: "#1F4E79",
  secondaryColor: "#2D6053",
  accentColor: "#AE792D",
  logoUrl: null,
  branding: {},
  supportEmail: null,
  maxActiveSessions: 5,
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordResetExpiryMinutes: 60
};

export async function getPlatformSettings(client = prisma) {
  return client.platformSettings.upsert({
    where: { id: "global" },
    update: {},
    create: defaultPlatformSettings
  });
}

export function passwordPolicyErrors(password, settings) {
  const errors = [];
  if (password.length < settings.passwordMinLength) {
    errors.push(`Usa al menos ${settings.passwordMinLength} caracteres`);
  }
  if (password.length > 72) errors.push("Usa como máximo 72 caracteres");
  if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Incluye una letra mayúscula");
  }
  if (settings.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push("Incluye una letra minúscula");
  }
  if (settings.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push("Incluye un número");
  }
  if (settings.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Incluye un carácter especial");
  }
  return errors;
}

export function assertPasswordPolicy(password, settings) {
  const errors = passwordPolicyErrors(password, settings);
  if (errors.length) throw new HttpError(400, "La contraseña no cumple los requisitos de la plataforma", errors);
}

export function generateTemporaryPassword(settings) {
  const groups = [];
  if (settings.passwordRequireUppercase) groups.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
  if (settings.passwordRequireLowercase) groups.push("abcdefghijkmnopqrstuvwxyz");
  if (settings.passwordRequireNumber) groups.push("23456789");
  if (settings.passwordRequireSpecial) groups.push("!@#$%&*+-=?");
  if (!groups.length) groups.push("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789");

  const all = groups.join("");
  const length = Math.max(settings.passwordMinLength, 16);
  const characters = groups.map((group) => group[randomInt(group.length)]);
  while (characters.length < length) characters.push(all[randomInt(all.length)]);

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

export function publicPlatformSettings(settings) {
  return {
    platformName: settings.platformName,
    platformSubtitle: settings.platformSubtitle,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    logoUrl: settings.logoUrl,
    branding: publicBranding(settings),
    supportEmail: settings.supportEmail,
    passwordPolicy: {
      minLength: settings.passwordMinLength,
      requireUppercase: settings.passwordRequireUppercase,
      requireLowercase: settings.passwordRequireLowercase,
      requireNumber: settings.passwordRequireNumber,
      requireSpecial: settings.passwordRequireSpecial
    }
  };
}
