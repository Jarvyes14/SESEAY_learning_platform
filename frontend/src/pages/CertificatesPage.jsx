import { Award, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import DisabledButton from "../components/DisabledButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeading from "../components/PageHeading.jsx";
import { api } from "../lib/api.js";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [verificationId, setVerificationId] = useState("");
  const [verified, setVerified] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/certificates")
      .then((result) => setCertificates(result.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

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

  return (
    <div className="container-page py-10">
      <PageHeading eyebrow="Credentials" title="Certificates" description="Certificates are generated automatically only after 100% completion and a passing final grade." actions={<DisabledButton>Download all PDFs</DisabledButton>} />
      {error && <p className="mt-5 rounded-md border border-error bg-error/10 p-4 text-sm text-error">{error}</p>}
      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_330px]">
        <section>
          {certificates.length ? <div className="space-y-5">{certificates.map((certificate) => <article key={certificate.id} className="panel p-6"><div className="flex items-start gap-5"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Award size={26} /></span><div><p className="eyebrow">{certificate.certificateId}</p><h2 className="mt-2 text-xl font-bold">{certificate.courseName}</h2><p className="mt-2 text-sm text-text-secondary">{certificate.studentName} · Final grade {certificate.finalGrade.toFixed(1)}%</p><p className="mt-1 text-xs text-text-secondary">{certificate.institutionName} · {new Date(certificate.completionDate).toLocaleDateString()}</p></div></div></article>)}</div> : <EmptyState title="No certificates" description="No qualifying course completion exists yet. The platform does not seed example credentials." />}
        </section>
        <aside className="panel h-fit p-6">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-4 text-xl font-bold">Verify certificate</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Enter the exact certificate ID to validate a database credential.</p>
          <form onSubmit={verify} className="mt-5"><input className="input-field" value={verificationId} onChange={(event) => setVerificationId(event.target.value)} placeholder="CERT-XXXXXXXXXXXX" required /><button className="btn-primary mt-3 w-full" type="submit"><Search size={16} /> Verify</button></form>
          {verified && <div className="mt-5 rounded-md border border-success bg-success/10 p-4 text-sm text-success"><strong>Valid certificate</strong><span className="mt-1 block">{verified.studentName} · {verified.courseName}</span></div>}
        </aside>
      </div>
    </div>
  );
}

