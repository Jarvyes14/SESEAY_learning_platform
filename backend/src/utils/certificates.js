import { prisma } from "../lib/prisma.js";
export const templateSelect = { id: true, name: true, nameX: true, nameY: true, nameWidth: true, fontSize: true, textColor: true, fontFamily: true, createdById: true, createdAt: true, updatedAt: true };
export async function persistCertificateImage(source) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(source ?? "");
  if (!match) throw new Error("Formato de imagen no válido");
  const asset = await prisma.brandAsset.create({ data: { fileName: "certificado", mimeType: match[1], kind: "image", content: Buffer.from(match[2], "base64") } });
  return `/api/settings/assets/${asset.id}`;
}
export function publicTemplate(template) {
  return { ...template, backgroundImage: `/api/certificates/templates/${template.id}/image?v=${new Date(template.updatedAt ?? 0).getTime()}` };
}
export function publicCertificate(certificate) {
  if (!certificate) return null;
  return { ...certificate, templateSnapshot: certificate.templateSnapshot ? { ...certificate.templateSnapshot, backgroundImage: `/api/certificates/verify/${certificate.certificateId}/image` } : null };
}
export function sendImage(res, source) {
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  if (/^\/api\/settings\/assets\/[a-f0-9-]+$/i.test(source ?? "")) return res.redirect(source);
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(source ?? "");
  if (!match) return res.status(404).json({ error: "No se encontró la imagen" });
  res.set("Cache-Control", "private, max-age=300");
  return res.type(match[1]).send(Buffer.from(match[2], "base64"));
}
