import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../context/PlatformContext.jsx";

export default function Logo({ compact = false }) {
  const { platform: branding } = usePlatform();

  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${branding.platformName} home`}>
      {branding.logoUrl ? <img src={branding.logoUrl} alt={`Logo de ${branding.platformName}`} className="size-10 rounded-md object-contain" /> : <span className="grid size-10 place-items-center rounded-md bg-primary text-inverse"><Landmark size={21} /></span>}
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold uppercase tracking-wide text-text-primary">
            {branding.platformName}
          </span>
          <span className="block text-xs text-text-secondary">{branding.platformSubtitle}</span>
        </span>
      )}
    </Link>
  );
}
