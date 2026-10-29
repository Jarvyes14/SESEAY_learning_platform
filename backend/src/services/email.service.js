import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } }
        : {})
    });
  }
  return transporter;
}

async function sendPlatformEmail({ to, subject, text, html, settings }) {
  const mailer = getTransporter();
  const from = env.SMTP_FROM ?? settings.supportEmail;
  if (!mailer || !from) return { sent: false, reason: "El servicio de correo SMTP no está configurado" };

  await mailer.sendMail({
    from,
    to,
    subject,
    text,
    html,
    ...(settings.supportEmail ? { replyTo: settings.supportEmail } : {})
  });
  return { sent: true };
}

export function sendInvitationEmail({ user, temporaryPassword, settings }) {
  const loginUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/login`;
  const subject = `Tu acceso a ${settings.platformName}`;
  const text = [
    `Hola, ${user.firstName}:`,
    "",
    `Se creó una cuenta para ti en ${settings.platformName}.`,
    `Correo electrónico: ${user.email}`,
    `Contraseña temporal: ${temporaryPassword}`,
    `Iniciar sesión: ${loginUrl}`,
    "",
    "Deberás crear una contraseña nueva al iniciar sesión por primera vez."
  ].join("\n");
  const html = `<p>Hola, ${escapeHtml(user.firstName)}:</p><p>Se creó una cuenta para ti en <strong>${escapeHtml(settings.platformName)}</strong>.</p><p>Correo electrónico: <strong>${escapeHtml(user.email)}</strong><br>Contraseña temporal: <strong>${escapeHtml(temporaryPassword)}</strong></p><p><a href="${loginUrl}">Iniciar sesión</a></p><p>Deberás crear una contraseña nueva al iniciar sesión por primera vez.</p>`;
  return sendPlatformEmail({ to: user.email, subject, text, html, settings });
}

export function sendPasswordResetEmail({ user, token, settings }) {
  const resetUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `Restablece tu contraseña de ${settings.platformName}`;
  const text = `Hola, ${user.firstName}:\n\nRestablece tu contraseña con este enlace de un solo uso:\n${resetUrl}\n\nEste enlace vence en ${settings.passwordResetExpiryMinutes} minutos. Si no solicitaste el cambio, puedes ignorar este correo.`;
  const html = `<p>Hola, ${escapeHtml(user.firstName)}:</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Este enlace de un solo uso vence en ${settings.passwordResetExpiryMinutes} minutos. Si no solicitaste el cambio, puedes ignorar este correo.</p>`;
  return sendPlatformEmail({ to: user.email, subject, text, html, settings });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
