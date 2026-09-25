import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const defaults = {
  platformName: "Integrity Learning",
  platformSubtitle: "Academia de Servicio Público",
  primaryColor: "#1F4E79",
  secondaryColor: "#2D6053",
  accentColor: "#AE792D",
  logoUrl: null
};

const PlatformContext = createContext(null);

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return `${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)}`;
}

function applyTheme(settings) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", hexToRgb(settings.primaryColor));
  root.style.setProperty("--color-secondary", hexToRgb(settings.secondaryColor));
  root.style.setProperty("--color-accent", hexToRgb(settings.accentColor));
  document.title = settings.platformName;
}

export function PlatformProvider({ children }) {
  const [platform, setPlatform] = useState(defaults);

  const refreshPlatform = useCallback(async () => {
    const result = await api("/settings/public");
    const next = { ...defaults, ...result.data };
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
