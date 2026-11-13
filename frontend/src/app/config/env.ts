/**
 * Environment-based application configuration.
 * Only VITE_-prefixed variables are available here; they are embedded
 * in the client bundle and must never contain secrets.
 */
export const env = {
  /** Base URL of the backend API. Empty in local dev (Vite proxy). */
  apiUrl: import.meta.env.VITE_API_URL ?? "",
} as const;

export const API_PREFIX = "/api/v1";
