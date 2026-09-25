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

export function courseAudienceWhere(user) {
  const audiences = [
    { accessType: "ROLE", accessRoleId: user.roleId },
    { accessType: "USERS", accessUsers: { some: { userId: user.id } } }
  ];
  if (user.organizationId) {
    audiences.push({
      accessType: "ORGANIZATION",
      accessOrganizationId: user.organizationId
    });
  }
  return { OR: audiences };
}

export async function assertCourseAccess(user, courseId) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
      ...courseAudienceWhere(user)
    }
  });
  if (!course) throw new HttpError(403, "This course is not available for your account");
  return course;
}

const protectedTypes = [
  "QUESTIONS",
  "FINAL_EXAM",
  "INCORRECT_SECTION",
  "CASE_STUDY",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
  "FILL_BLANKS"
];

function sanitizeContent(type, source) {
  const content = structuredClone(source ?? {});
  if (!protectedTypes.includes(type)) return content;
  if (Array.isArray(content.questions)) {
    content.questions = content.questions.map(({ correctIndex, ...question }) => question);
  }
  if (Array.isArray(content.sections)) {
    content.sections = content.sections.map(({ incorrect, ...section }) => section);
  }
  if (Array.isArray(content.statements)) {
    content.statements = content.statements.map(({ correctAnswer, ...statement }) => statement);
  }
  if (Array.isArray(content.pairs)) {
    content.leftItems = content.pairs.map((pair, index) => ({ id: index, text: pair.left }));
    content.rightItems = content.pairs
      .map((pair, index) => ({ id: index, text: pair.right }))
      .reverse();
    delete content.pairs;
  }
  if (Array.isArray(content.items)) {
    content.displayItems = content.items
      .map((text, index) => ({ id: index, text }))
      .reverse();
    delete content.items;
  }
  if (Array.isArray(content.sentences)) {
    content.sentences = content.sentences.map(({ answer, caseSensitive, ...sentence }) => sentence);
  }
  return content;
}

export function sanitizeActivity(activity, canEdit) {
  if (canEdit) return activity;

  const content = activity.type === "COMPOSITE"
    ? {
        ...(activity.content ?? {}),
        modules: (activity.content?.modules ?? []).map((module) => ({
          ...module,
          content: sanitizeContent(module.type, module.content)
        }))
      }
    : sanitizeContent(activity.type, activity.content);

  const attempts = activity.attempts?.map((attempt) => {
    if (!["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(activity.type)) return attempt;
    const answers = attempt.response?.answers ?? [];
    return {
      ...attempt,
      feedback: (activity.content?.questions ?? []).map((question, index) => ({
        selectedIndex: answers[index],
        correct: answers[index] === question.correctIndex
      }))
    };
  });

  return { ...activity, content, ...(attempts ? { attempts } : {}) };
}
