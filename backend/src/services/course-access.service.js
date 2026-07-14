import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { ROLES } from "../lib/roles.js";

export async function getCourseOrThrow(courseId, include = undefined) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include
  });
  if (!course) throw new HttpError(404, "Course not found");
  return course;
}

export async function assertCourseEditor(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  if (
    user.role.name === ROLES.INSTRUCTOR &&
    course.instructorId !== user.id
  ) {
    throw new HttpError(403, "Instructors may only edit their own courses");
  }
  if (
    user.role.name === ROLES.ORGANIZATION_ADMIN &&
    course.organizationId !== user.organizationId
  ) {
    throw new HttpError(403, "Course is outside your organization");
  }
  return course;
}

export function sanitizeActivity(activity, canEdit) {
  if (canEdit || !["QUESTIONS", "FINAL_EXAM", "INCORRECT_SECTION"].includes(activity.type)) {
    return activity;
  }

  const content = structuredClone(activity.content ?? {});
  if (Array.isArray(content.questions)) {
    content.questions = content.questions.map(({ correctIndex, ...question }) => question);
  }
  if (Array.isArray(content.sections)) {
    content.sections = content.sections.map(({ incorrect, ...section }) => section);
  }
  return { ...activity, content };
}

