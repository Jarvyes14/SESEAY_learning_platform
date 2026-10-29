import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { canAccessCourse } from "../lib/permissions.js";

export async function getCourseOrThrow(courseId, include = undefined) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include
  });
  if (!course) throw new HttpError(404, "No se encontró el curso");
  return course;
}

export async function assertCourseEditor(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  if (!canAccessCourse(user, course)) throw new HttpError(403, "El curso está fuera de tu alcance de acceso");
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
  if (!course) throw new HttpError(403, "Este curso no está disponible para tu cuenta");
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

  const feedbackFor = (type, source, response = {}) => {
    if (["QUESTIONS", "FINAL_EXAM", "CASE_STUDY"].includes(type)) {
      return (source?.questions ?? []).map((question, index) => ({ selectedIndex: response.answers?.[index], correctIndex: question.correctIndex, correct: response.answers?.[index] === question.correctIndex }));
    }
    if (type === "TRUE_FALSE") return (source?.statements ?? []).map((statement, index) => ({ selectedAnswer: response.answers?.[index], correctAnswer: statement.correctAnswer, correct: response.answers?.[index] === statement.correctAnswer }));
    if (type === "ORDERING") return (response.order ?? []).map((itemId, index) => ({ itemId, correct: itemId === index }));
    if (type === "MATCHING") return (response.matches ?? []).map((matchId, index) => ({ selectedId: matchId, correct: matchId === index }));
    if (type === "FILL_BLANKS") return (source?.sentences ?? []).map((sentence, index) => ({ answer: response.answers?.[index], correct: String(response.answers?.[index] ?? "").trim().toLocaleLowerCase("es-MX") === String(sentence.answer).trim().toLocaleLowerCase("es-MX") }));
    if (type === "INCORRECT_SECTION") {
      const selected = response.selectedIndices ?? [];
      return (source?.sections ?? []).map((section, index) => ({ selected: selected.includes(index), correct: selected.includes(index) === section.incorrect }));
    }
    return null;
  };

  const attempts = activity.attempts?.map((attempt) => {
    if (activity.type === "COMPOSITE") {
      return {
        ...attempt,
        feedback: Object.fromEntries((activity.content?.modules ?? []).map((module) => [module.id, feedbackFor(module.type, module.content, attempt.response?.modules?.[module.id])]))
      };
    }
    return { ...attempt, feedback: feedbackFor(activity.type, activity.content, attempt.response) };
  });

  return { ...activity, content, ...(attempts ? { attempts } : {}) };
}
