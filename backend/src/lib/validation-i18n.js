import { z } from "zod";

const typeNames = { string: "texto", number: "número", boolean: "valor verdadero o falso", array: "lista", object: "objeto", date: "fecha", integer: "número entero" };

export function spanishZodErrorMap(issue) {
  let message = "El valor ingresado no es válido.";
  switch (issue.code) {
    case "invalid_type":
      message = issue.received === "undefined" ? "Este campo es obligatorio." : `Se requiere ${["array", "date"].includes(issue.expected) ? "una" : "un"} ${typeNames[issue.expected] ?? "valor válido"}.`;
      break;
    case "invalid_string":
      message = issue.validation === "email" ? "Ingresa un correo electrónico válido." : issue.validation === "url" ? "Ingresa una URL válida." : issue.validation === "uuid" ? "El identificador no es válido." : "El texto no tiene el formato requerido.";
      break;
    case "too_small":
      message = issue.type === "string" ? `Escribe al menos ${issue.minimum} ${issue.minimum === 1 ? "carácter" : "caracteres"}.` : issue.type === "array" ? `Agrega al menos ${issue.minimum} ${issue.minimum === 1 ? "elemento" : "elementos"}.` : `El valor debe ser ${issue.inclusive ? "mayor o igual que" : "mayor que"} ${issue.minimum}.`;
      break;
    case "too_big":
      message = issue.type === "string" ? `Escribe como máximo ${issue.maximum} ${issue.maximum === 1 ? "carácter" : "caracteres"}.` : issue.type === "array" ? `Agrega como máximo ${issue.maximum} ${issue.maximum === 1 ? "elemento" : "elementos"}.` : `El valor debe ser ${issue.inclusive ? "menor o igual que" : "menor que"} ${issue.maximum}.`;
      break;
    case "invalid_enum_value": case "invalid_literal": message = "Selecciona una opción válida."; break;
    case "unrecognized_keys": message = "La solicitud contiene campos no permitidos."; break;
    case "invalid_union": case "invalid_union_discriminator": message = "Revisa el valor de este campo."; break;
    case "invalid_date": message = "Ingresa una fecha válida."; break;
    case "not_multiple_of": message = `Ingresa un múltiplo de ${issue.multipleOf}.`; break;
    case "not_finite": message = "Ingresa un número finito."; break;
    case "custom": message = issue.message ?? message; break;
  }
  return { message };
}

z.setErrorMap(spanishZodErrorMap);
