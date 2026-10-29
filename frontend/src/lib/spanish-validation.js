export function spanishValidationMessage(input) {
  const validity = input.validity;
  if (validity.valueMissing) return input.type === "checkbox" ? "Marca esta casilla para continuar." : ["radio", "select-one", "select-multiple"].includes(input.type) ? "Selecciona una opción." : "Completa este campo.";
  if (validity.typeMismatch) return input.type === "email" ? "Ingresa un correo electrónico válido." : input.type === "url" ? "Ingresa una URL válida." : "Ingresa un valor válido.";
  if (validity.tooShort) return `Escribe al menos ${input.minLength} caracteres.`;
  if (validity.tooLong) return `Escribe como máximo ${input.maxLength} caracteres.`;
  if (validity.rangeUnderflow) return `El valor debe ser mayor o igual que ${input.min}.`;
  if (validity.rangeOverflow) return `El valor debe ser menor o igual que ${input.max}.`;
  if (validity.stepMismatch) return "Ingresa un valor que respete el incremento indicado.";
  if (validity.badInput) return "Ingresa un número válido.";
  if (validity.patternMismatch) return "El valor no tiene el formato requerido.";
  return "Revisa el valor de este campo.";
}

export function installSpanishValidation() {
  const clear = event => { if (typeof event.target?.setCustomValidity === "function") event.target.setCustomValidity(""); };
  const invalid = event => { if (typeof event.target?.setCustomValidity === "function") { event.target.setCustomValidity(""); event.target.setCustomValidity(spanishValidationMessage(event.target)); } };
  document.addEventListener("invalid", invalid, true);
  document.addEventListener("input", clear, true);
  document.addEventListener("change", clear, true);
  return () => { document.removeEventListener("invalid", invalid, true); document.removeEventListener("input", clear, true); document.removeEventListener("change", clear, true); };
}
