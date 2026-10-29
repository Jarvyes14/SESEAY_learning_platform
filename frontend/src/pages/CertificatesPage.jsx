import useDialog from "../hooks/useDialog.js";
import { can } from "../lib/permissions.js";
import { Award, Eye, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import CertificateTemplateDesigner from "../components/CertificateTemplateDesigner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api, assetUrl } from "../lib/api.js";
import { certificateCanvasStyle, certificateNameStyle, downloadCertificatePng } from "../lib/certificate-preview.js";

export default function CertificatesPage() {
  const { user } = useAuth();
  const canDesign = can(user, "certificate_templates.view");
  const canViewCertificates = can(user, "certificates.view");
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [verificationId, setVerificationId] = useState("");
  const [verified, setVerified] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewCertificate, setPreviewCertificate] = useState(null);

  useEffect(() => {
    const requests = [canViewCertificates ? api("/certificates") : Promise.resolve({ data: [] })];
    if (canDesign) requests.push(api("/certificates/templates"));
    Promise.all(requests)
      .then(([certificateResult, templateResult]) => {
        setCertificates(certificateResult.data);
        if (templateResult) setTemplates(templateResult.data);
      })
      .catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [canDesign, canViewCertificates]);

  async function verify(event) {
    event.preventDefault();
    try {
      const result = await api(`/certificates/verify/${verificationId}`);
      setVerified(result.data);
      setError("");
    } catch (requestError) {
      setVerified(null);
      setError(requestError.message);
    }
  }

  if (loading) return <div className="container-page py-10" role="status">Cargando certificados...</div>;

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Credenciales" title="Certificados" description="Diseña plantillas visuales, asígnalas opcionalmente a los cursos y consulta los certificados que ya fueron emitidos." />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      {success && <p className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success">{success}</p>}
      {canDesign && <CertificateTemplateDesigner templates={templates} setTemplates={setTemplates} setError={setError} setSuccess={setSuccess} />}
      <div className="mt-12 border-t border-border pt-8">
        <div className="mb-5"><p className="eyebrow">Historial</p><h2 className="mt-2 text-2xl font-bold">Certificados emitidos</h2></div>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_330px]">
        <section>
          {certificates.length ? <div className="space-y-5">{certificates.map((certificate) => <article key={certificate.id} className="panel p-6"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3 sm:gap-5"><span className="grid size-10 shrink-0 sm:size-14 place-items-center rounded-full bg-primary/10 text-primary"><Award size={26} /></span><div><p className="eyebrow">{certificate.certificateId}</p>{certificate.revokedAt && <p className="text-sm font-bold text-error">Revocado</p>}<h2 className="mt-2 text-xl font-bold">{certificate.courseName}</h2><p className="mt-2 text-sm text-text-secondary">{certificate.studentName} · Calificación final {certificate.finalGrade.toFixed(1)}%</p><p className="mt-1 text-xs text-text-secondary">{certificate.institutionName} · {new Date(certificate.completionDate).toLocaleDateString("es-MX")}</p></div></div>{certificate.templateSnapshot && !certificate.revokedAt && <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setPreviewCertificate(certificate)}><Eye size={16} /> Ver certificado</button>}</div></article>)}</div> : <EmptyState title="Sin certificados" description="Todavía no existen cursos completados que cumplan los requisitos." />}
        </section>
        <aside className="panel h-fit p-6">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Verificar certificado</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Ingresa el identificador exacto para validar la credencial.</p>
          <form onSubmit={verify} className="mt-5"><input className="input-field" value={verificationId} onChange={(event) => setVerificationId(event.target.value)} placeholder="CERT-XXXXXXXXXXXX" required /><button className="btn-primary mt-3 w-full" type="submit"><Search size={16} /> Verificar</button></form>
          {verified && <div className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success"><strong>Certificado válido</strong><span className="mt-1 block">{verified.studentName} · {verified.courseName}</span></div>}
        </aside>
        </div>
      </div>
      {previewCertificate && <IssuedCertificateModal certificate={previewCertificate} onClose={() => setPreviewCertificate(null)} />}
    </div>
  );
}

function IssuedCertificateModal({ certificate, onClose }) {
  const dialogRef = useDialog(true, onClose);
  const template = certificate.templateSnapshot;
  return <div ref={dialogRef} className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-overlay/85 p-3 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="issued-certificate-title"><div className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl sm:max-h-[calc(100dvh-3rem)]"><header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4"><div><p className="eyebrow">Certificado emitido</p><h2 id="issued-certificate-title" className="mt-1 text-xl font-bold">{certificate.studentName}</h2></div><div className="flex max-w-full flex-wrap items-center gap-2"><button type="button" className="btn-primary" onClick={() => downloadCertificatePng(certificate)}>Descargar PNG</button><button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-muted" onClick={onClose} aria-label="Cerrar certificado"><X size={21} /></button></div></header><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted p-4 md:p-8"><div className="relative mx-auto overflow-hidden rounded-md border border-border bg-white shadow-xl" style={certificateCanvasStyle}><img src={assetUrl(template.backgroundImage)} alt={`Certificado de ${certificate.studentName}`} className="block h-auto w-full" /><span className="absolute flex items-center justify-center text-center font-bold leading-tight" style={certificateNameStyle(template)}>{certificate.studentName}</span></div><div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-text-secondary"><span>{certificate.courseName}</span><span>{certificate.certificateId} · {new Date(certificate.completionDate).toLocaleDateString("es-MX")}</span></div></div></div></div>;
}
