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
  if (!mailer || !from) return { sent: false, reason: "SMTP is not configured" };

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
  const subject = `Your access to ${settings.platformName}`;
  const text = [
    `Hello ${user.firstName},`,
    "",
    `An account was created for you at ${settings.platformName}.`,
    `Email: ${user.email}`,
    `Temporary password: ${temporaryPassword}`,
    `Sign in: ${loginUrl}`,
    "",
    "You will be required to create a new password when you first sign in."
  ].join("\n");
  const html = `<p>Hello ${escapeHtml(user.firstName)},</p><p>An account was created for you at <strong>${escapeHtml(settings.platformName)}</strong>.</p><p>Email: <strong>${escapeHtml(user.email)}</strong><br>Temporary password: <strong>${escapeHtml(temporaryPassword)}</strong></p><p><a href="${loginUrl}">Sign in</a></p><p>You will be required to create a new password when you first sign in.</p>`;
  return sendPlatformEmail({ to: user.email, subject, text, html, settings });
}

export function sendPasswordResetEmail({ user, token, settings }) {
  const resetUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `Reset your ${settings.platformName} password`;
  const text = `Hello ${user.firstName},\n\nReset your password using this one-time link:\n${resetUrl}\n\nThis link expires in ${settings.passwordResetExpiryMinutes} minutes. If you did not request it, you can ignore this email.`;
  const html = `<p>Hello ${escapeHtml(user.firstName)},</p><p><a href="${resetUrl}">Reset your password</a></p><p>This one-time link expires in ${settings.passwordResetExpiryMinutes} minutes. If you did not request it, you can ignore this email.</p>`;
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
