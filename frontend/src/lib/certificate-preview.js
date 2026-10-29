import { assetUrl } from "./api.js";
const DESIGN_CANVAS_WIDTH = 900;

export const certificateCanvasStyle = { containerType: "inline-size" };

export function certificateNameStyle(template) {
  const fontSize = Number(template.fontSize) || 42;
  return {
    left: `${template.nameX}%`,
    top: `${template.nameY}%`,
    width: `${template.nameWidth}%`,
    transform: "translate(-50%, -50%)",
    color: template.textColor,
    fontFamily: template.fontFamily,
    fontSize: `${(fontSize / DESIGN_CANVAS_WIDTH) * 100}cqw`
  };
}

export async function downloadCertificatePng(certificate) {
  const template = certificate?.templateSnapshot;
  if (!template?.backgroundImage) throw new Error("El certificado no tiene una plantilla disponible");

  const image = new Image();
  image.crossOrigin = "use-credentials";
  image.src = assetUrl(template.backgroundImage);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("No fue posible cargar la plantilla del certificado"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.fillStyle = template.textColor;
  context.font = `700 ${(Number(template.fontSize) / DESIGN_CANVAS_WIDTH) * canvas.width}px ${template.fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    certificate.studentName,
    canvas.width * (template.nameX / 100),
    canvas.height * (template.nameY / 100),
    canvas.width * (template.nameWidth / 100)
  );

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No fue posible generar la descarga del certificado");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `certificado-${certificate.certificateId}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}
