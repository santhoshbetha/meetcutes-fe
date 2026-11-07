/**
 * Thin JSON API client for the Elixir/Phoenix backend.
 *
 * Every authenticated request reads the current bearer token from the auth
 * store through `setAuthTokenGetter`, so callers never have to pass tokens
 * around manually.
 */

import { toast } from "sonner";

// Vite statically replaces `import.meta.env.VITE_API_URL` at build/dev time.
// Keep the access direct (no optional chaining) so the replacement applies.
const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const API_BASE_URL = String(rawBaseUrl).replace(/\/+$/, "");

let authTokenGetter = () => null;
let unauthorizedHandler = null;

export function setAuthTokenGetter(getter) {
  authTokenGetter = typeof getter === "function" ? getter : () => null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, errors = null, payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.payload = payload;
  }
}

function humanizeField(field) {
  return String(field)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function describeApiError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  if (error.errors && typeof error.errors === "object") {
    const [field, messages] = Object.entries(error.errors)[0] || [];
    if (field) {
      const message = Array.isArray(messages) ? messages[0] : messages;
      return `${humanizeField(field)} ${message}`;
    }
  }

  return error.message || fallback;
}

function errorMessageFromPayload(payload, status) {
  if (payload && typeof payload === "object") {
    if (typeof payload.msg === "string" && payload.msg.trim()) {
      return payload.msg;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  return `Request failed (${status})`;
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Performs a JSON request against the Phoenix API.
 *
 * @param {string} path - Path beginning with a slash, e.g. "/api/users/login".
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {unknown} [options.body]
 * @param {boolean} [options.auth] - Attach the bearer token (default true).
 * @param {AbortSignal} [options.signal]
 * @param {Record<string, string>} [options.headers]
 */
export async function apiRequest(
  path,
  { method = "GET", body, auth = true, signal, headers = {} } = {},
) {
  const token = auth ? authTokenGetter() : null;
  const requestHeaders = { Accept: "application/json", ...headers };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body:
        body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", {
        code: "timeout",
      });
    }

    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      { code: "network_error" },
    );
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    // A 401 on an authenticated request means the opaque bearer token is no
    // longer valid. Let the app clear its local session.
    if (response.status === 401 && token) {
      unauthorizedHandler?.();
    }

    if (response.status === 429) {
      toast.warning(
        errorMessageFromPayload(
          payload,
          "You're navigating too quickly. Please wait a moment before trying again.",
        ),
      );
    }

    throw new ApiError(errorMessageFromPayload(payload, response.status), {
      status: response.status,
      code: payload?.code ?? null,
      errors: payload?.errors ?? null,
      payload,
    });
  }

  return payload;
}

export const api = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) =>
    apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) =>
    apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) =>
    apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) =>
    apiRequest(path, { ...options, method: "DELETE" }),
};

export default api;
