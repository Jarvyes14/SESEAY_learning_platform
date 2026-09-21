import crypto from "node:crypto";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { assertCourseAccess } from "./course-access.service.js";

export async function getOrderedActivities(courseId, client = prisma) {
  const blocks = await client.courseBlock.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { activities: { orderBy: { order: "asc" } } }
      }
    }
  });

  return blocks.flatMap((block) =>
    block.topics.flatMap((topic) =>
      topic.activities.map((activity) => ({
        ...activity,
        blockId: block.id,
        blockTitle: block.title,
        topicId: topic.id,
        topicTitle: topic.title
      }))
    )
  );
}

export async function initializeEnrollment(student, courseId) {
  const course = await assertCourseAccess(student, courseId);

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId } }
  });
  if (existing) return existing;

  const activities = await getOrderedActivities(courseId);
  if (!activities.length) {
    throw new HttpError(400, "This course has no activities and cannot be enrolled");
  }

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        studentId: student.id,
        courseId,
        organizationId: student.organizationId
      }
    });
    await tx.courseProgress.create({ data: { enrollmentId: enrollment.id } });
    await tx.activityProgress.createMany({
      data: activities.map((activity, index) => ({
        enrollmentId: enrollment.id,
        studentId: student.id,
        activityId: activity.id,
        status: index === 0 ? "AVAILABLE" : "LOCKED"
      }))
    });
    return enrollment;
  });
}

export async function getStudentEnrollment(studentId, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    include: { course: true, courseProgress: true }
  });
  if (!enrollment) throw new HttpError(404, "Enrollment not found");
  return enrollment;
}

export async function requireAccessibleProgress(studentId, activityId) {
  const progress = await prisma.activityProgress.findFirst({
    where: { studentId, activityId },
    include: {
      activity: {
        include: {
          topic: { include: { block: { include: { course: true } } } }
        }
      },
      enrollment: true
    }
  });
  if (!progress) throw new HttpError(404, "Activity progress not found");
  if (progress.status === "LOCKED") {
    throw new HttpError(409, "Complete the previous activity first");
  }
  if (progress.enrollment.status === "WITHDRAWN") {
    throw new HttpError(409, "Enrollment is not active");
  }
  return progress;
}

export async function startActivity(studentId, activityId) {
  const progress = await requireAccessibleProgress(studentId, activityId);
  if (progress.status === "COMPLETED" || progress.status === "PENDING_REVIEW") return progress;
  return prisma.activityProgress.update({
    where: { id: progress.id },
    data: {
      status: "IN_PROGRESS",
      startedAt: progress.startedAt ?? new Date()
    }
  });
}

async function unlockNextActivity(tx, enrollmentId, activityId, courseId) {
  const activities = await getOrderedActivities(courseId, tx);
  const currentIndex = activities.findIndex((activity) => activity.id === activityId);
  const next = activities[currentIndex + 1];
  if (next) {
    await tx.activityProgress.updateMany({
      where: { enrollmentId, activityId: next.id, status: "LOCKED" },
      data: { status: "AVAILABLE" }
    });
  }
}

export async function completeActivity(progressId) {
  const progress = await prisma.activityProgress.findUnique({
    where: { id: progressId },
    include: {
      activity: { include: { topic: { include: { block: true } } } }
    }
  });
  if (!progress) throw new HttpError(404, "Activity progress not found");

  await prisma.$transaction(async (tx) => {
    await tx.activityProgress.update({
      where: { id: progress.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    await unlockNextActivity(
      tx,
      progress.enrollmentId,
      progress.activityId,
      progress.activity.topic.block.courseId
    );
  });
  return recalculateEnrollment(progress.enrollmentId);
}

export async function recalculateEnrollment(enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: true,
      organization: true,
      course: true,
      activityProgress: true
    }
  });
  if (!enrollment) throw new HttpError(404, "Enrollment not found");

  const total = enrollment.activityProgress.length;
  const completed = enrollment.activityProgress.filter(
    (item) => item.status === "COMPLETED"
  ).length;
  const completionPercent = total ? Math.round((completed / total) * 10000) / 100 : 0;

  const grades = await prisma.grade.findMany({
    where: { enrollmentId, isFinal: false, activityId: { not: null } }
  });
  const bestGrades = new Map();
  for (const grade of grades) {
    const current = bestGrades.get(grade.activityId);
    if (!current || grade.percentage > current.percentage) {
      bestGrades.set(grade.activityId, grade);
    }
  }
  const selectedGrades = [...bestGrades.values()];
  const score = selectedGrades.reduce((sum, grade) => sum + grade.score, 0);
  const maxScore = selectedGrades.reduce((sum, grade) => sum + grade.maxScore, 0);
  const finalGrade = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 100;
  const courseCompleted = total > 0 && completed === total;
  const passed = courseCompleted && finalGrade >= enrollment.course.passingGrade;
  const completedAt = courseCompleted ? new Date() : null;

  const courseProgress = await prisma.courseProgress.upsert({
    where: { enrollmentId },
    update: { completionPercent, finalGrade, passed, completedAt },
    create: { enrollmentId, completionPercent, finalGrade, passed, completedAt }
  });

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: courseCompleted ? "COMPLETED" : "ACTIVE",
      completedAt
    }
  });

  if (courseCompleted) {
    await prisma.grade.deleteMany({ where: { enrollmentId, isFinal: true } });
    await prisma.grade.create({
      data: {
        enrollmentId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: finalGrade,
        maxScore: 100,
        percentage: finalGrade,
        isFinal: true
      }
    });
  }

  if (passed && enrollment.course.certificateEnabled) {
    const institutionName =
      enrollment.organization?.institutionName ??
      enrollment.organization?.name ??
      "Government Learning Platform";
    await prisma.certificate.upsert({
      where: { enrollmentId },
      update: { finalGrade, completionDate: completedAt, revokedAt: null },
      create: {
        enrollmentId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        organizationId: enrollment.organizationId,
        certificateId: `CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        courseName: enrollment.course.title,
        institutionName,
        completionDate: completedAt,
        finalGrade
      }
    });
  }

  return courseProgress;
}

export function gradeAutomaticActivity(activity, response) {
  if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(activity.type)) {
    const questions = activity.content?.questions ?? [];
    const answers = response?.answers ?? [];
    const maxScore = questions.reduce((sum, question) => sum + (question.points ?? 1), 0);
    const score = questions.reduce(
      (sum, question, index) =>
        sum + (answers[index] === question.correctIndex ? question.points ?? 1 : 0),
      0
    );
    return { score, maxScore };
  }

  if (activity.type === "INCORRECT_SECTION") {
    const sections = activity.content?.sections ?? [];
    const expected = sections
      .map((section, index) => (section.incorrect ? index : null))
      .filter((index) => index !== null);
    const selected = [...(response?.selectedIndices ?? [])].sort();
    const correct =
      expected.length === selected.length &&
      expected.every((index, position) => index === selected[position]);
    return { score: correct ? activity.points || 1 : 0, maxScore: activity.points || 1 };
  }

  if (activity.type === "TRUE_FALSE") {
    const statements = activity.content?.statements ?? [];
    const answers = response?.answers ?? [];
    const maxScore = statements.reduce((sum, statement) => sum + (statement.points ?? 1), 0);
    const score = statements.reduce(
      (sum, statement, index) =>
        sum + (answers[index] === statement.correctAnswer ? statement.points ?? 1 : 0),
      0
    );
    return { score, maxScore };
  }

  if (activity.type === "MATCHING") {
    const pairs = activity.content?.pairs ?? [];
    const matches = response?.matches ?? [];
    const score = pairs.reduce((sum, _pair, index) => sum + (matches[index] === index ? 1 : 0), 0);
    return { score, maxScore: pairs.length };
  }

  if (activity.type === "ORDERING") {
    const items = activity.content?.items ?? [];
    const order = response?.order ?? [];
    const score = items.reduce((sum, _item, index) => sum + (order[index] === index ? 1 : 0), 0);
    return { score, maxScore: items.length };
  }

  if (activity.type === "FILL_BLANKS") {
    const sentences = activity.content?.sentences ?? [];
    const answers = response?.answers ?? [];
    const normalize = (value, caseSensitive) => {
      const trimmed = String(value ?? "").trim();
      return caseSensitive ? trimmed : trimmed.toLocaleLowerCase("es-MX");
    };
    const maxScore = sentences.reduce((sum, sentence) => sum + (sentence.points ?? 1), 0);
    const score = sentences.reduce(
      (sum, sentence, index) =>
        sum +
        (normalize(answers[index], sentence.caseSensitive) ===
        normalize(sentence.answer, sentence.caseSensitive)
          ? sentence.points ?? 1
          : 0),
      0
    );
    return { score, maxScore };
  }

  throw new HttpError(400, "This activity is not automatically graded");
}

export async function recordGrade(attempt, score, maxScore, assignedById = null) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  return prisma.grade.upsert({
    where: { attemptId: attempt.id },
    update: { score, maxScore, percentage, assignedById },
    create: {
      enrollmentId: attempt.enrollmentId,
      studentId: attempt.studentId,
      courseId: attempt.activity.topic.block.courseId,
      activityId: attempt.activityId,
      attemptId: attempt.id,
      score,
      maxScore,
      percentage,
      assignedById
    }
  });
}

export function aggregateHierarchy(blocks, progressRecords) {
  const statusByActivity = new Map(
    progressRecords.map((progress) => [progress.activityId, progress])
  );
  const percentage = (items) => {
    if (!items.length) return 0;
    return Math.round(
      (items.filter((item) => item.status === "COMPLETED").length / items.length) * 10000
    ) / 100;
  };

  return blocks.map((block) => {
    const topics = block.topics.map((topic) => {
      const activities = topic.activities.map((activity) => ({
        ...activity,
        progress: statusByActivity.get(activity.id) ?? null
      }));
      return {
        ...topic,
        activities,
        completionPercent: percentage(activities.map((item) => item.progress).filter(Boolean))
      };
    });
    const blockProgress = topics.flatMap((topic) =>
      topic.activities.map((activity) => activity.progress).filter(Boolean)
    );
    return { ...block, topics, completionPercent: percentage(blockProgress) };
  });
}
