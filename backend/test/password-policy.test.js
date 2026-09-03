import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTemporaryPassword,
  passwordPolicyErrors
} from "../src/services/platform-settings.service.js";

const settings = {
  passwordMinLength: 14,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true
};

test("generated temporary passwords satisfy the configured policy", () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const password = generateTemporaryPassword(settings);
    assert.equal(passwordPolicyErrors(password, settings).length, 0);
    assert.ok(password.length >= 14);
  }
});

test("password policy reports every missing requirement", () => {
  const errors = passwordPolicyErrors("short", settings);
  assert.equal(errors.length, 4);
});
