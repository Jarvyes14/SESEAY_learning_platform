import { usePlatform } from "../context/PlatformContext.jsx";

export default function BrandFooter() {
  const { platform } = usePlatform();
  const { contact, entity } = platform.branding;
  if (!contact.showFooter) return null;
  return <footer className="mt-auto border-t border-border bg-surface py-6 text-sm text-text-secondary"><div className="container-page flex flex-wrap justify-between gap-5"><div className="max-w-2xl"><p className="font-semibold text-text-primary">{contact.footerText || entity || platform.platformName}</p>{contact.address && <p className="mt-2">{contact.address}</p>}</div><div className="flex flex-wrap items-center gap-x-5 gap-y-2">{contact.phone && <span>{contact.phone}</span>}{contact.website && <a className="font-semibold text-primary" href={contact.website} target="_blank" rel="noreferrer">Sitio institucional</a>}{platform.supportEmail && <a className="text-primary" href={`mailto:${platform.supportEmail}`}>{platform.supportEmail}</a>}</div></div></footer>;
}
