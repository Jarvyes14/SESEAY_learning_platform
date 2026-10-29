import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { assetUrl } from "../lib/api.js";
import { normalizeBranding, themeVariables, installBrandFonts } from "../lib/branding.js";

const defaults = {
  platformName: "Plataforma de aprendizaje",
  platformSubtitle: "Academia de Servicio Público",
  primaryColor: "#1F4E79",
  secondaryColor: "#2D6053",
  accentColor: "#AE792D",
  logoUrl: null,
  branding: normalizeBranding()
};

const PlatformContext = createContext(null);

function applyTheme(settings) {
  const root = document.documentElement;
  const brand = normalizeBranding(settings.branding);
  for (const [key, value] of Object.entries(themeVariables(settings))) root.style.setProperty(key, value);
  root.style.fontSize = `${brand.fonts.baseSize}px`;
  installBrandFonts(brand);
  document.title = settings.platformName;
  let icon = document.querySelector('link[data-brand-favicon]');
  if (brand.faviconUrl) {
    if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; icon.dataset.brandFavicon = "true"; document.head.appendChild(icon); }
    icon.href = assetUrl(brand.faviconUrl);
  } else { icon?.remove(); }
}

export function PlatformProvider({ children }) {
  const [platform, setPlatform] = useState(defaults);

  const refreshPlatform = useCallback(async () => {
    const result = await api("/settings/public");
    const next = { ...defaults, ...result.data, branding: normalizeBranding(result.data.branding) };
    setPlatform(next);
    applyTheme(next);
    return next;
  }, []);

  useEffect(() => {
    refreshPlatform().catch(() => applyTheme(defaults));
  }, [refreshPlatform]);

  const value = useMemo(() => ({ platform, refreshPlatform }), [platform, refreshPlatform]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatform() {
  return useContext(PlatformContext);
}
