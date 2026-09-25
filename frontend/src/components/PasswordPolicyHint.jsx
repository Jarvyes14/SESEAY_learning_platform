export default function PasswordPolicyHint({ policy }) {
  if (!policy) return null;
  const requirements = [`mínimo ${policy.minLength} caracteres`];
  if (policy.requireUppercase) requirements.push("una letra mayúscula");
  if (policy.requireLowercase) requirements.push("una letra minúscula");
  if (policy.requireNumber) requirements.push("un número");
  if (policy.requireSpecial) requirements.push("un carácter especial");
  return <p className="text-xs text-text-secondary">La contraseña debe incluir: {requirements.join(", ")}.</p>;
}
