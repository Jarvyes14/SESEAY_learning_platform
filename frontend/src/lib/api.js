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
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

export async function api(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    const error = new Error(payload.error ?? "Request failed");
    error.details = payload.details;
    error.status = response.status;
    throw error;
  }
  return payload;
}
