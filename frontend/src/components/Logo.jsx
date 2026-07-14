import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Integrity Learning home">
      <span className="grid size-10 place-items-center rounded-md bg-primary text-inverse">
        <Landmark size={21} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold uppercase tracking-wide text-text-primary">
            Integrity Learning
          </span>
          <span className="block text-xs text-text-secondary">Public Service Academy</span>
        </span>
      )}
    </Link>
  );
}

