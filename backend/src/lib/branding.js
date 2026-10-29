import { z } from "zod";

export const brandColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Usa un color HEX de 6 dígitos");
export const brandUrl = z.string().max(2000).refine((value) => {
  if (/^\/api\/settings\/assets\/[0-9a-f-]{36}$/i.test(value)) return true;
  if (/^\/brand-assets\/[a-z0-9._-]+$/i.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Usa un recurso de marca o una URL HTTPS");
const text = (length = 200) => z.string().trim().max(length);
const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const optionalUrl = brandUrl.or(z.literal(""));
const fontRole = z.string().max(100).regex(/^[a-zA-Z0-9 _-]+$/);

export const brandingSchema = z.object({
  entity: text(100),
  logos: z.array(z.object({ id: identifier, name: text(100).min(1), entity: text(100), variant: z.enum(["horizontal", "vertical", "symbol", "monochrome", "inverse", "letterhead"]), url: brandUrl }).strict()).max(40),
  desktopLogoId: text(80), mobileLogoId: text(80), inverseLogoId: text(80),
  faviconUrl: optionalUrl,
  showBrandText: z.boolean(), logoHeight: z.number().int().min(24).max(96), mobileLogoHeight: z.number().int().min(24).max(64),
  logoMaxWidth: z.number().int().min(100).max(440), clearSpace: z.number().int().min(0).max(32), printMinWidthMm: z.number().min(10).max(100),
  colors: z.object({
    background: brandColor, surface: brandColor, surfaceMuted: brandColor, textPrimary: brandColor, textSecondary: brandColor,
    border: brandColor, inverse: brandColor, overlay: brandColor, success: brandColor, warning: brandColor, error: brandColor
  }).strict(),
  palettes: z.array(z.object({ id: identifier, group: z.enum(["institutional", "primary", "secondary"]), name: text(100).min(1), hex: brandColor, pantone: text(100), cmyk: text(100), note: text(500) }).strict()).max(40),
  fonts: z.object({
    heading: fontRole, body: fontRole, logo: fontRole, materials: fontRole,
    headingWeight: z.number().int().min(100).max(900).multipleOf(100), bodyWeight: z.number().int().min(100).max(900).multipleOf(100),
    baseSize: z.number().int().min(14).max(20), lineHeight: z.number().min(1.3).max(2),
    custom: z.array(z.object({ id: identifier, name: text(100).min(1), url: brandUrl, weight: z.number().int().min(100).max(900).multipleOf(100) }).strict()).max(12)
  }).strict(),
  contact: z.object({ address: text(500), phone: text(80), website: optionalUrl, footerText: text(500), showFooter: z.boolean() }).strict(),
  login: z.object({ title: text(250), description: text(1000), imageUrl: optionalUrl }).strict(),
  resources: z.array(z.object({ id: identifier, name: text(150).min(1), category: z.enum(["manual", "grid", "letterhead", "business-card", "presentation", "other"]), url: brandUrl, description: text(1000) }).strict()).max(30),
  guidelines: text(6000)
}).strict().superRefine((brand, ctx) => {
  const ids = brand.logos.map((logo) => logo.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["logos"], message: "Los identificadores de logo deben ser únicos" });
  for (const key of ["palettes", "resources"]) {
    if (new Set(brand[key].map(item => item.id)).size !== brand[key].length) ctx.addIssue({ code: "custom", path: [key], message: "Los identificadores deben ser únicos" });
  }
  for (const key of ["desktopLogoId", "mobileLogoId", "inverseLogoId"]) {
    if (brand[key] && !ids.includes(brand[key])) ctx.addIssue({ code: "custom", path: [key], message: "Selecciona un logotipo de la biblioteca" });
  }
  const fontIds = brand.fonts.custom.map((font) => font.id);
  if (new Set(fontIds).size !== fontIds.length) ctx.addIssue({ code: "custom", path: ["fonts", "custom"], message: "Los identificadores de fuente deben ser únicos" });
  const builtInFonts = ["Inter", "Roboto", "Montserrat", "Source Serif 4", "Arial", "Georgia", "Myriad Pro"];
  for (const role of ["heading", "body", "logo", "materials"]) {
    if (!builtInFonts.includes(brand.fonts[role]) && !fontIds.includes(brand.fonts[role])) ctx.addIssue({ code: "custom", path: ["fonts", role], message: "Selecciona una fuente disponible" });
  }
});

export function publicBranding(settings) {
  // Legacy installations keep their existing colors and logo until a brand profile is saved.
  return settings.branding && typeof settings.branding === "object" ? settings.branding : {};
}
