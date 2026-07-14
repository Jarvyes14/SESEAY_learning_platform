const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
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
    const error = new Error(payload.error ?? "Request failed");
    error.details = payload.details;
    error.status = response.status;
    throw error;
  }
  return payload;
}

