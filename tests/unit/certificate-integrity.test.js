import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ enrollment: null }));
const mock = vi.hoisted(() => ({ enrollment: { findUnique: vi.fn(async () => state.enrollment) }, certificate: { upsert: vi.fn(async args => ({ id: "issued", ...args.create })) } }));
vi.mock("../../backend/src/lib/prisma.js", () => ({ prisma: mock }));
import { issueCertificateForEnrollment } from "../../backend/src/services/certificate.service.js";
beforeEach(() => {
  vi.clearAllMocks();
  state.enrollment = { id: "enrollment", studentId: "person", courseId: "course", student: { firstName: "Persona", lastName: "Participante" }, course: { passingGrade: 70, title: "Curso", certificateTemplate: { name: "Plantilla", backgroundImage: "data:image/png;base64,AA==" } }, courseProgress: { completionPercent: 100, finalGrade: 100, passed: true }, certificate: null };
});
describe("Certificados de cursos aprobados", () => {
  it("rechaza una bandera de aprobación inconsistente con la nota mínima", async () => {
    state.enrollment.courseProgress = { completionPercent: 100, finalGrade: 69, passed: true };
    await expect(issueCertificateForEnrollment("enrollment")).rejects.toThrow("aprobar");
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("rechaza un curso sin calificación válida", async () => {
    state.enrollment.courseProgress.finalGrade = null;
    await expect(issueCertificateForEnrollment("enrollment")).rejects.toThrow("aprobar");
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("rechaza un curso incompleto incluso con nota aprobatoria", async () => {
    state.enrollment.courseProgress.completionPercent = 99;
    await expect(issueCertificateForEnrollment("enrollment")).rejects.toThrow("Completa");
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("rechaza un curso terminado con calificacion insuficiente", async () => {
    state.enrollment.courseProgress = { completionPercent: 100, finalGrade: 0, passed: false };
    await expect(issueCertificateForEnrollment("enrollment")).rejects.toThrow("aprobar");
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("no permite reactivar un certificado revocado", async () => {
    state.enrollment.certificate = { id: "old", revokedAt: new Date() };
    await expect(issueCertificateForEnrollment("enrollment")).rejects.toThrow("revocado");
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("conserva un certificado ya emitido y su copia visual", async () => {
    const certificate = { id: "old", templateSnapshot: { name: "Original" } };
    state.enrollment.certificate = certificate;
    expect(await issueCertificateForEnrollment("enrollment")).toEqual(certificate);
    expect(mock.certificate.upsert).not.toHaveBeenCalled();
  });
  it("emite al aprobar y no modifica certificados concurrentes", async () => {
    await issueCertificateForEnrollment("enrollment");
    expect(mock.certificate.upsert.mock.calls[0][0].update).toEqual({});
  });
});
