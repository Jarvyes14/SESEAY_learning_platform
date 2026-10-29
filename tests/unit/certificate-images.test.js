import { describe, expect, it } from "vitest";
import { publicCertificate, publicTemplate, sendImage } from "../../backend/src/utils/certificates.js";
describe("Imagenes de certificados", () => {
  it("excluye los datos de imagen de las listas", () => {
    const certificate = publicCertificate({ certificateId: "CERT-TEST", templateSnapshot: { backgroundImage: "data:image/png;base64,AA==", fontSize: 42 } });
    expect(certificate.templateSnapshot.backgroundImage).toBe("/api/certificates/verify/CERT-TEST/image");
    expect(JSON.stringify(certificate)).not.toContain("base64");
    expect(publicTemplate({ id: "template", updatedAt: new Date(0) }).backgroundImage).toContain("/templates/template/image");
  });
  it("permite cargar imagenes desde el frontend antes de redirigir al archivo", () => {
    const calls = [];
    const response = { set: (...args) => calls.push(["set", ...args]), redirect: url => calls.push(["redirect", url]) };
    sendImage(response, "/api/settings/assets/11111111-1111-4111-8111-111111111111");
    expect(calls[0]).toEqual(["set", "Cross-Origin-Resource-Policy", "cross-origin"]);
    expect(calls[1][0]).toBe("redirect");
  });
});
