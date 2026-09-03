export default function PasswordPolicyHint({ policy }) {
  if (!policy) return null;
  const requirements = [`At least ${policy.minLength} characters`];
  if (policy.requireUppercase) requirements.push("one uppercase letter");
  if (policy.requireLowercase) requirements.push("one lowercase letter");
  if (policy.requireNumber) requirements.push("one number");
  if (policy.requireSpecial) requirements.push("one special character");
  return <p className="text-xs text-text-secondary">Password policy: {requirements.join(", ")}.</p>;
}
