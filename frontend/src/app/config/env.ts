/**
 * Environment-based application configuration.
 * Only VITE_-prefixed variables are available here; they are embedded
 * in the client bundle and must never contain secrets.
 */
export const env = {
  /**
   * Base URL of the backend API.
   * Empty in local development (Vite dev-server proxy, localhost:8000);
   * set VITE_API_BASE_URL in deployed environments, e.g.
   * https://curvin-pvt.onrender.com.
   */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
} as const;

export const API_PREFIX = "/api/v1";
