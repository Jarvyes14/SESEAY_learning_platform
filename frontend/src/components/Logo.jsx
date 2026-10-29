import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../context/PlatformContext.jsx";
import { assetUrl } from "../lib/api.js";
import { normalizeBranding } from "../lib/branding.js";

export default function Logo({ compact = false, inverse = false, previewSettings }) {
  const { platform } = usePlatform();
  const branding = previewSettings ?? platform;
  const brand = normalizeBranding(branding.branding);
  const desktop = brand.logos.find(logo => logo.id === (inverse ? brand.inverseLogoId : brand.desktopLogoId));
  const mobile = inverse ? desktop : brand.logos.find(logo => logo.id === brand.mobileLogoId) ?? desktop;
  const desktopUrl = desktop?.url ?? (inverse ? null : branding.logoUrl);
  const mobileUrl = mobile?.url ?? desktopUrl;
  const hasLogo = Boolean(desktopUrl || mobileUrl);

  return (
    <Link to="/" className="brand-logo inline-flex max-w-full items-center gap-2 sm:gap-3" style={{ "--logo-height": `${brand.logoHeight}px`, "--logo-height-mobile": `${brand.mobileLogoHeight}px`, "--logo-max-width": `${brand.logoMaxWidth}px`, "--logo-clear-space": `${brand.clearSpace}px`, "--logo-print-min": `${brand.printMinWidthMm}mm` }} aria-label={`${branding.platformName} · Inicio`}>
      {hasLogo ? <><img src={assetUrl(desktopUrl ?? mobileUrl)} alt={`Logo de ${brand.entity || branding.platformName}`} className="brand-logo-image brand-logo-desktop shrink-0" /><img src={assetUrl(mobileUrl ?? desktopUrl)} alt={`Logo de ${brand.entity || branding.platformName}`} className="brand-logo-image brand-logo-mobile shrink-0" /></> : <span className={`grid size-10 shrink-0 place-items-center rounded-md ${inverse ? "bg-inverse/10 text-inverse" : "bg-primary text-inverse"}`}><Landmark size={21} /></span>}
      {!compact && (brand.showBrandText || !hasLogo) && (
        <span className="min-w-0 leading-tight">
          <span className={`block text-sm font-bold uppercase tracking-wide ${inverse ? "text-inverse" : "text-text-primary"}`} style={{ fontFamily: "var(--font-logo)" }}>
            {branding.platformName}
          </span>
          <span className={`block text-xs ${inverse ? "text-inverse/80" : "text-text-secondary"}`}>{branding.platformSubtitle}</span>
        </span>
      )}
    </Link>
  );
}
