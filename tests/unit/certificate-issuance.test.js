import { describe, expect, it } from "vitest";
import { certificateTemplateSnapshot, shouldIssueCertificate } from "../../backend/src/services/certificate.service.js";

describe("Emisión de certificados", () => {
  it("emite al completar el curso cuando existe una plantilla", () => {
    expect(shouldIssueCertificate({ courseCompleted: true, passed: true, certificateTemplate: { id: "template" } })).toBe(true);
  });

  it("no emite si no se aprobo", () => { expect(shouldIssueCertificate({ courseCompleted: true, passed: false, certificateTemplate: { id: "template" } })).toBe(false); });

  it("no emite si el curso no está completo", () => {
    expect(shouldIssueCertificate({ courseCompleted: false, certificateTemplate: { id: "template" } })).toBe(false);
  });

  it("no emite para un curso sin certificado", () => {
    expect(shouldIssueCertificate({ courseCompleted: true, passed: true, certificateTemplate: null })).toBe(false);
  });

  it("conserva una copia visual de la plantilla emitida", () => {
    const template = { name: "Institucional", backgroundImage: "data:image/png;base64,AA==", nameX: 50, nameY: 52, nameWidth: 60, fontSize: 42, textColor: "#112233", fontFamily: "serif", createdById: "ignored" };
    expect(certificateTemplateSnapshot(template)).toEqual({ name: "Institucional", backgroundImage: "data:image/png;base64,AA==", nameX: 50, nameY: 52, nameWidth: 60, fontSize: 42, textColor: "#112233", fontFamily: "serif" });
  });
});
