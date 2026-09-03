import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Logo({ compact = false }) {
  const [branding, setBranding] = useState({
    platformName: "Integrity Learning",
    platformSubtitle: "Public Service Academy"
  });

  useEffect(() => {
    api("/settings/public").then((result) => setBranding(result.data)).catch(() => {});
  }, []);

  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${branding.platformName} home`}>
      <span className="grid size-10 place-items-center rounded-md bg-primary text-inverse">
        <Landmark size={21} />
      </span>
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
