import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeActivity } from "../src/services/course-access.service.js";
import { gradeAutomaticActivity } from "../src/services/learning.service.js";

test("true or false activities grade each statement", () => {
  const result = gradeAutomaticActivity(
    {
      type: "TRUE_FALSE",
      content: {
        statements: [
          { prompt: "One", correctAnswer: true, points: 2 },
          { prompt: "Two", correctAnswer: false, points: 1 }
        ]
      }
    },
    { answers: [true, true] }
  );
  assert.deepEqual(result, { score: 2, maxScore: 3 });
});

test("matching and ordering activities award one point per correct position", () => {
  assert.deepEqual(
    gradeAutomaticActivity(
      { type: "MATCHING", content: { pairs: [{ left: "A", right: "1" }, { left: "B", right: "2" }] } },
      { matches: [0, 0] }
    ),
    { score: 1, maxScore: 2 }
  );
  assert.deepEqual(
    gradeAutomaticActivity(
      { type: "ORDERING", content: { items: ["First", "Second", "Third"] } },
      { order: [0, 2, 1] }
    ),
    { score: 1, maxScore: 3 }
  );
});

test("fill in the blanks respects case sensitivity", () => {
  const result = gradeAutomaticActivity(
    {
      type: "FILL_BLANKS",
      content: {
        sentences: [
          { prompt: "A", answer: "Curso", caseSensitive: false, points: 1 },
          { prompt: "B", answer: "SESEAY", caseSensitive: true, points: 2 }
        ]
      }
    },
    { answers: [" curso ", "seseay"] }
  );
  assert.deepEqual(result, { score: 1, maxScore: 3 });
});

test("student activity payloads hide every correct answer", () => {
  const sanitized = sanitizeActivity(
    {
      type: "TRUE_FALSE",
      content: { statements: [{ prompt: "Statement", correctAnswer: true, points: 1 }] }
    },
    false
  );
  assert.equal(sanitized.content.statements[0].correctAnswer, undefined);
  assert.equal(sanitized.content.statements[0].prompt, "Statement");
});
