import { api, assetUrl } from "./api.js";

export const FONT_OPTIONS = ["Inter", "Roboto", "Montserrat", "Source Serif 4", "Arial", "Georgia", "Myriad Pro"];
export const ENTITIES = ["Secretaría Ejecutiva", "Sistema Estatal Anticorrupción de Yucatán", "Comité de Participación Ciudadana", "Comité Coordinador", "Comisión de Selección"];
export const VARIANTS = { horizontal: "Horizontal", vertical: "Vertical", symbol: "Compacto / símbolo", monochrome: "Monocromático", inverse: "Sobre fondo oscuro", letterhead: "Papelería" };
export const RESOURCE_CATEGORIES = { manual: "Manual de identidad", grid: "Retícula y protección", letterhead: "Hoja membretada", "business-card": "Tarjeta de presentación", presentation: "Presentación", other: "Otro recurso" };
export const COLOR_ROLES = { background: "Fondo de página", surface: "Superficie de tarjetas", surfaceMuted: "Fondos secundarios", textPrimary: "Texto principal", textSecondary: "Texto secundario", border: "Bordes", inverse: "Texto sobre color", overlay: "Fondo de diálogos", success: "Éxito", warning: "Advertencia", error: "Error" };
export const PALETTE_GROUPS = { institutional: "Institucionales", primary: "Principales", secondary: "Secundarios" };

export const BRAND_DEFAULTS = {
  entity: "Secretaría Ejecutiva", logos: [], desktopLogoId: "", mobileLogoId: "", inverseLogoId: "", faviconUrl: "",
  showBrandText: true, logoHeight: 40, mobileLogoHeight: 40, logoMaxWidth: 280, clearSpace: 0, printMinWidthMm: 30,
  colors: { background: "#F4F6F8", surface: "#FFFFFF", surfaceMuted: "#EAEEF2", textPrimary: "#1A242F", textSecondary: "#586571", border: "#C6CFD8", inverse: "#FFFFFF", overlay: "#141F2B", success: "#277755", warning: "#B5711B", error: "#AB3739" },
  palettes: [],
  fonts: { heading: "Source Serif 4", body: "Inter", logo: "Inter", materials: "Montserrat", headingWeight: 700, bodyWeight: 400, baseSize: 16, lineHeight: 1.6, custom: [] },
  contact: { address: "", phone: "", website: "", footerText: "", showFooter: false },
  login: { title: "Gestión del aprendizaje para fortalecer la integridad pública.", description: "Crea cursos, controla el avance secuencial, revisa tareas, calcula calificaciones y emite certificados verificables.", imageUrl: "" },
  resources: [], guidelines: ""
};

export function normalizeBranding(value = {}) {
  return { ...BRAND_DEFAULTS, ...value, colors: { ...BRAND_DEFAULTS.colors, ...value.colors }, fonts: { ...BRAND_DEFAULTS.fonts, ...value.fonts }, contact: { ...BRAND_DEFAULTS.contact, ...value.contact }, login: { ...BRAND_DEFAULTS.login, ...value.login } };
}

const swatch = (id, group, name, hex, pantone, cmyk, note = "") => ({ id, group, name, hex, pantone, cmyk, note });
export const SEAY_PALETTES = [
  swatch("green", "institutional", "Verde institucional", "#004823", "3435 C", "94, 43, 100, 49"),
  swatch("gold", "institutional", "Dorado institucional", "#9E882F", "112 C", "35, 35, 89, 19"),
  swatch("black", "institutional", "Negro institucional", "#1D1D1B", "BLACK C", "0, 0, 0, 100"),
  swatch("brown", "institutional", "Café de las variantes", "#461E0E", "7631 C", "45, 82, 87, 70"),
  swatch("lime", "primary", "Verde claro", "#76B82A", "368 C", "60, 0, 100, 0"),
  swatch("gray", "primary", "Gris", "#575756", "Negro 80%", "0, 0, 0, 80"),
  swatch("green-c", "primary", "Verde Green C", "#004823", "GREEN C", "78, 4, 53, 0", "Página 7: HEX #004823 y RGB 0,153,130 no coinciden. Se conserva el HEX impreso; verifica con el responsable de marca antes de usarlo."),
  swatch("deep-green", "primary", "Verde 3295 C", "#006555", "3295 C", "100, 30, 70, 30", "Página 7: RGB impreso 0,98,80; el HEX impreso #006555 corresponde a 0,101,85."),
  swatch("yellow", "secondary", "Amarillo", "#FFDF56", "13-0647", "2, 10, 75, 0", "Página 8: RGB impreso 225,223,86; el HEX #FFDF56 corresponde a 255,223,86."),
  swatch("purple", "secondary", "Rebecca Purple", "#575756", "REBECCA PURPLE", "71, 87, 24, 11", "Página 8: el HEX impreso #575756 es gris; el RGB impreso 99,56,112 es morado (#633870). Revisa la referencia antes de aplicarla."),
  swatch("teal", "secondary", "Teal", "#057777", "TEAL", "85, 30, 49, 17"),
  swatch("turquoise", "secondary", "Turquesa", "#0BC1B4", "DARK TURQUOISE", "70, 0, 38, 0", "El HEX aparece como #OBC184 en la página 8; se usa el RGB impreso 11,193,180 para una referencia digital válida (#0BC1B4).")
];

export function seayPreset() {
  const logos = [
    ["seseay", ENTITIES[0], ["horizontal", "vertical", "compact"]], ["seay", ENTITIES[1], ["horizontal", "vertical"]],
    ["cpc", ENTITIES[2], ["horizontal", "vertical", "compact"]], ["cc", ENTITIES[3], ["horizontal", "vertical", "compact"]], ["cs", ENTITIES[4], ["horizontal", "vertical", "compact"]]
  ].flatMap(([prefix, entity, variants]) => variants.map((variant) => ({ id: `${prefix}-${variant}`, name: `${prefix.toUpperCase()} · ${variant === "compact" ? "Compacto" : VARIANTS[variant]}`, entity, variant: variant === "compact" ? "symbol" : variant, url: `/brand-assets/${prefix}-${variant}.png` })));
  return normalizeBranding({
    logos, desktopLogoId: "seseay-horizontal", mobileLogoId: "seseay-compact", showBrandText: false, logoHeight: 56, mobileLogoHeight: 48, clearSpace: 8,
    colors: { ...BRAND_DEFAULTS.colors, textPrimary: "#1D1D1B", textSecondary: "#575756", success: "#006555", warning: "#9E882F" },
    palettes: structuredClone(SEAY_PALETTES),
    fonts: { ...BRAND_DEFAULTS.fonts, heading: "Inter", body: "Roboto", logo: "Myriad Pro", materials: "Montserrat" },
    contact: { address: "Av. Alemán No. 51 (5 y 5 A), Col. Felipe Carrillo Puerto, Mérida, Yucatán. C.P. 97208.", phone: "999.565.5620", website: "https://www.seay.mx", footerText: "Sistema Estatal Anticorrupción de Yucatán", showFooter: true },
    resources: [{ id: "seay-manual", name: "Manual de identidad SEAY · abril 2026", category: "manual", url: "/brand-assets/seay-manual-2026.pdf", description: "Documento de referencia original de 25 páginas. Incluye retícula, protección, papelería y presentaciones." }],
    guidelines: "Conservar las proporciones de los logotipos y su zona de protección (unidad x, página 9). Ancho mínimo impreso: 3 cm. Las variantes corresponden a SEAY, Secretaría Ejecutiva, CPC, Comité Coordinador y Comisión de Selección. Para web: Inter en títulos y Roboto en cuerpo. Para presentaciones y piezas: Montserrat. Para el logo y papelería: Myriad Pro; carga los archivos tipográficos correspondientes si necesitas usarla como texto. Los logotipos de referencia se extrajeron del manual sin redibujarlos; puedes sustituirlos por los originales SVG o PNG. La retícula y los ejemplos de papelería y presentación se consultan en las páginas 14 y 21–23."
  });
}

export function hexRgb(hex) { const value = /^#[a-f\d]{6}$/i.test(hex ?? "") ? hex.slice(1) : "000000"; return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16)); }
export function fontFamily(role, branding) {
  const custom = branding.fonts.custom.find(font => font.id === role);
  return custom ? `"brand-font-${custom.id}", sans-serif` : `"${FONT_OPTIONS.includes(role) ? role : "Inter"}", ${["Georgia", "Source Serif 4"].includes(role) ? "serif" : "sans-serif"}`;
}

const loadedFonts = new Set();
export async function installBrandFonts(branding) {
  if (typeof FontFace === "undefined") return;
  await Promise.allSettled(branding.fonts.custom.map(async (font) => {
    const key = `${font.id}:${font.url}:${font.weight}`;
    if (loadedFonts.has(key)) return;
    const face = new FontFace(`brand-font-${font.id}`, `url(${JSON.stringify(assetUrl(font.url))})`, { weight: String(font.weight), display: "swap" });
    await face.load(); document.fonts.add(face); loadedFonts.add(key);
  }));
}

export function themeVariables(settings) {
  const brand = normalizeBranding(settings.branding);
  const vars = { "--font-body": fontFamily(brand.fonts.body, brand), "--font-heading": fontFamily(brand.fonts.heading, brand), "--font-logo": fontFamily(brand.fonts.logo, brand), "--font-materials": fontFamily(brand.fonts.materials, brand), "--font-weight-heading": brand.fonts.headingWeight, "--font-weight-body": brand.fonts.bodyWeight, "--body-line-height": brand.fonts.lineHeight };
  const colors = { primary: settings.primaryColor, secondary: settings.secondaryColor, accent: settings.accentColor, ...brand.colors };
  for (const [key, value] of Object.entries(colors)) vars[`--color-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`] = hexRgb(value).join(" ");
  return vars;
}

const mimeByExt = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
export async function uploadBrandAsset(file, kind) {
  const max = kind === "font" ? 2_000_000 : 4_000_000;
  if (file.size > max) throw new Error(`El archivo no puede superar ${max / 1_000_000} MB.`);
  const mimeType = mimeByExt[file.name.split(".").pop().toLowerCase()];
  if (!mimeType) throw new Error("Selecciona uno de los formatos indicados.");
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("No se pudo leer el archivo.")); reader.readAsDataURL(file); });
  return (await api("/settings/assets", { method: "POST", body: JSON.stringify({ fileName: file.name, kind, mimeType, base64 }) })).data;
}
