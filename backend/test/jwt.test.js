import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL =
  "postgresql://integrity:integrity_dev_password@localhost:5432/integrity_learning?schema=public";
process.env.JWT_SECRET = "test-secret-with-at-least-thirty-two-characters";
process.env.JWT_EXPIRES_IN = "1h";
process.env.COOKIE_SECURE = "false";

const {
  accessTokenExpiresAt,
  authCookieOptions,
  authCookieOptionsUntil,
  signAccessToken,
  verifyAccessToken
} = await import("../src/lib/jwt.js");

test("access tokens identify both the user and the persisted session", () => {
  const user = {
    id: "ef8345a7-e342-4f65-9580-57de0f4fbbd6",
    role: { name: "student" },
    organizationId: null
  };
  const sessionId = "a6ef52fb-7618-4d08-a0fe-af95780eaa2d";

  const token = signAccessToken(user, sessionId);
  const payload = verifyAccessToken(token);
  const expiresAt = accessTokenExpiresAt(token);

  assert.equal(payload.sub, user.id);
  assert.equal(payload.jti, sessionId);
  assert.equal(payload.role, "student");
  assert.equal(payload.organizationId, null);
  assert.ok(expiresAt.getTime() > Date.now());
});

test("the authentication cookie expires with its access token", () => {
  const expiresAt = new Date(Date.now() + 60_000);
  const options = authCookieOptionsUntil(expiresAt);

  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, false);
  assert.equal(options.sameSite, "lax");
  assert.ok(options.maxAge <= 60_000 && options.maxAge > 55_000);
  assert.equal(authCookieOptions.maxAge, undefined);
});

test("tokens without an expiration are rejected by the expiration helper", () => {
  assert.throws(() => accessTokenExpiresAt("not-a-token"), /does not have an expiration/);
});
