import crypto from "node:crypto";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export function shouldIssueCertificate({ courseCompleted, passed, certificateTemplate }) {
  return Boolean(courseCompleted && passed && certificateTemplate);
}

export function certificateTemplateSnapshot(template) {
  return {
    name: template.name,
    backgroundImage: template.backgroundImage,
    nameX: template.nameX,
    nameY: template.nameY,
    nameWidth: template.nameWidth,
    fontSize: template.fontSize,
    textColor: template.textColor,
    fontFamily: template.fontFamily
  };
}

export async function issueCertificateForEnrollment(enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: true,
      organization: true,
      course: { include: { certificateTemplate: true } },
      courseProgress: true,
      certificate: true
    }
  });
  if (!enrollment) throw new HttpError(404, "Inscripción no encontrada");
  if ((enrollment.courseProgress?.completionPercent ?? 0) < 100) {
    throw new HttpError(409, "Completa el curso antes de reclamar el certificado");
  }
  const grade = enrollment.courseProgress?.finalGrade;
  if (!enrollment.courseProgress?.passed || !Number.isFinite(grade) || grade < enrollment.course.passingGrade) {
    throw new HttpError(409, "Debes aprobar el curso para obtener el certificado");
  }
  if (enrollment.certificate?.revokedAt) {
    throw new HttpError(409, "Este certificado fue revocado. Contacta a la administración");
  }
  if (enrollment.certificate) return enrollment.certificate;
  if (!enrollment.course.certificateTemplate) {
    throw new HttpError(409, "Este curso no tiene un certificado configurado");
  }

  const institutionName = enrollment.organization?.institutionName ?? enrollment.organization?.name ?? "Plataforma de capacitación";
  const templateSnapshot = certificateTemplateSnapshot(enrollment.course.certificateTemplate);
  const finalGrade = enrollment.courseProgress?.finalGrade ?? 100;
  const completionDate = enrollment.courseProgress?.completedAt ?? enrollment.completedAt ?? new Date();

  return prisma.certificate.upsert({
    where: { enrollmentId },
    update: {},
    create: {
      enrollmentId,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      organizationId: enrollment.organizationId,
      certificateId: `CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      courseName: enrollment.course.title,
      institutionName,
      completionDate,
      finalGrade,
      templateSnapshot
    }
  });
}
