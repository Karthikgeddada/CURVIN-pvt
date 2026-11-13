import { API_PREFIX, env } from "@/app/config/env";
import { ApiError } from "@/core/error-handling/ApiError";
import type { HealthResponse } from "@/shared/types/api";

/**
 * Central API client. All network access goes through this module so
 * error handling, headers and tracing stay consistent everywhere.
 */
const BASE_URL = `${env.apiBaseUrl}${API_PREFIX}`;

export class ApiClient {
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json", ...init?.headers },
        ...init,
      });
    } catch (cause) {
      throw new ApiError(0, "network_error", "Unable to reach CURVIN services.", {
        cause,
      });
    }

    if (!response.ok) {
      let code = `http_${response.status}`;
      let message = response.statusText || "Unexpected service response.";
      try {
        const body = (await response.json()) as {
          error?: { code?: string; message?: string };
        };
        if (body.error?.code) code = body.error.code;
        if (body.error?.message) message = body.error.message;
      } catch {
        // Non-JSON error body — keep HTTP defaults.
      }
      throw new ApiError(response.status, code, message);
    }

    return (await response.json()) as T;
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }
}

export const apiClient = new ApiClient();
