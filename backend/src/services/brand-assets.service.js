import { HttpError } from "../lib/http-error.js";

const signatures = {
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  "image/svg+xml": (b) => /<svg[\s>]/i.test(b.toString("utf8")) && !/<(?:script|foreignObject|iframe|object|embed)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript:|https?:|\/\/)|<!ENTITY/i.test(b.toString("utf8")),
  "image/x-icon": (b) => b.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])),
  "font/woff": (b) => b.toString("ascii", 0, 4) === "wOFF",
  "font/woff2": (b) => b.toString("ascii", 0, 4) === "wOF2",
  "font/ttf": (b) => b.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])),
  "font/otf": (b) => b.toString("ascii", 0, 4) === "OTTO",
  "application/pdf": (b) => b.toString("ascii", 0, 5) === "%PDF-",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) => b.toString("ascii", 0, 2) === "PK",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": (b) => b.toString("ascii", 0, 2) === "PK"
};

export function decodeBrandAsset({ kind, mimeType, base64 }) {
  const content = Buffer.from(base64, "base64");
  const allowed = kind === "image" ? mimeType.startsWith("image/") : kind === "font" ? mimeType.startsWith("font/") : mimeType.startsWith("application/") || mimeType.startsWith("image/");
  if (!allowed || !signatures[mimeType]?.(content)) throw new HttpError(400, "El archivo no coincide con un formato de marca permitido");
  const max = kind === "font" ? 2_000_000 : 4_000_000;
  if (!content.length || content.length > max) throw new HttpError(400, `El archivo supera el límite de ${max / 1_000_000} MB`);
  return content;
}
