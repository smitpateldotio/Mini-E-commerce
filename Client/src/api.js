const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TOKEN_KEY = "forme.accessToken";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error(
      `Can't reach the API at ${API_ROOT}. Start the server or check VITE_API_URL.`,
    );
  }

  if (response.status === 403 && retry && path !== "/auth/refresh-token") {
    const refreshed = await request(
      "/auth/refresh-token",
      { method: "POST" },
      false,
    );
    if (refreshed?.data?.accessToken) {
      setToken(refreshed.data.accessToken);
      return request(path, options, false);
    }
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload.message || "Something went wrong. Please try again.",
    );
  return payload;
}

export const api = (path, options) => request(path, options);
export const jsonBody = (value) => JSON.stringify(value);

export function tokenRole(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(encoded)).role || "user";
  } catch {
    return "user";
  }
}
