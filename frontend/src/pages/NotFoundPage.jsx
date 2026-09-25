import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Página no encontrada</h1>
      <p className="mt-3 text-text-secondary">La página que solicitaste no está disponible.</p>
      <Link to="/" className="btn-primary mt-7">Volver al inicio</Link>
    </div>
  );
}
