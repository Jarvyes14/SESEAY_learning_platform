function normalizeApiBaseUrl(value) {
  const fallback = import.meta.env.DEV ? "http://localhost:4000/api" : "/api";
  const raw = String(value ?? fallback).trim();

  if (!raw || /^https?:\/?$/i.test(raw) || /^https?:\/\/$/i.test(raw)) {
    return fallback;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return url.toString().replace(/\/$/, "");
    } catch {
      return fallback;
    }
  }

  const relativePath = raw.startsWith("/") ? raw : `/${raw}`;
  return relativePath.replace(/\/$/, "");
}

const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
export function assetUrl(value) {
  return value?.startsWith("/api/") ? `${API_URL.replace(/\/api$/, "")}${value}` : value;
}
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

export async function api(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let response;
  try {
    response = await fetch(`${API_URL}${normalizedPath}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });
  } catch {
    throw new Error("No fue posible conectar con la plataforma. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    const error = new Error(payload.error ?? "No se pudo completar la solicitud");
    error.details = payload.details;
    error.status = response.status;
    throw error;
  }
  return payload;
}
