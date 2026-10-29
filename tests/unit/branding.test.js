import { describe, expect, it } from "vitest";
import { brandingSchema, brandUrl } from "../../backend/src/lib/branding.js";
import { decodeBrandAsset } from "../../backend/src/services/brand-assets.service.js";
import { seayPreset, normalizeBranding, themeVariables } from "../../frontend/src/lib/branding.js";

describe("Identidad institucional", () => {
  it("valida la propuesta completa del manual y conserva sus discrepancias como notas", () => {
    const preset = seayPreset();
    expect(brandingSchema.safeParse(preset).success).toBe(true);
    expect(preset.logos).toHaveLength(14);
    expect(preset.fonts.heading).toBe("Inter");
    expect(preset.fonts.body).toBe("Roboto");
    expect(preset.palettes.find(color => color.id === "purple").note).toContain("#633870");
    expect(preset.printMinWidthMm).toBe(30);
  });

  it("rechaza selecciones de logos inexistentes y familias de fuente sin registrar", () => {
    const preset = seayPreset();
    expect(brandingSchema.safeParse({ ...preset, mobileLogoId: "missing" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...preset, fonts: { ...preset.fonts, body: "unregistered-font" } }).success).toBe(false);
  });

  it("rechaza URLs ejecutables, rutas fuera de marca y HTTP sin cifrar", () => {
    for (const url of ["javascript:alert(1)", "/brand-assets/../secret", "http://example.com/logo.svg", "data:text/html;base64,AAAA"]) expect(brandUrl.safeParse(url).success).toBe(false);
    expect(brandUrl.safeParse("/brand-assets/seseay-horizontal.png").success).toBe(true);
  });

  it("mantiene los valores heredados y produce variables de todos los roles visuales", () => {
    expect(normalizeBranding().fonts.heading).toBe("Source Serif 4");
    const vars = themeVariables({ primaryColor: "#004823", secondaryColor: "#006555", accentColor: "#9E882F", branding: seayPreset() });
    expect(vars["--color-primary"]).toBe("0 72 35");
    expect(vars["--color-text-primary"]).toBe("29 29 27");
    expect(vars["--font-body"]).toContain("Roboto");
  });
});

describe("Archivos de identidad", () => {
  const upload = (kind, mimeType, bytes) => ({ kind, mimeType, base64: Buffer.from(bytes).toString("base64") });
  it("comprueba contenido y tipo de archivo, y rechaza SVG activo", () => {
    expect(decodeBrandAsset(upload("image", "image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')).length).toBeGreaterThan(0);
    expect(() => decodeBrandAsset(upload("image", "image/png", "not a png"))).toThrow();
    expect(() => decodeBrandAsset(upload("image", "image/svg+xml", '<svg onload="alert(1)"></svg>'))).toThrow();
    expect(() => decodeBrandAsset(upload("font", "application/pdf", "%PDF-1.7"))).toThrow();
  });

  it("aplica el límite a los bytes decodificados de las fuentes", () => {
    const bytes = Buffer.alloc(2_000_001); bytes.write("wOF2");
    expect(() => decodeBrandAsset(upload("font", "font/woff2", bytes))).toThrow("2 MB");
  });
});
