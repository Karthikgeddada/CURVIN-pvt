import { API_PREFIX, env } from "@/app/config/env";
import { ApiError } from "@/core/error-handling/ApiError";
import type { HealthResponse } from "@/shared/types/api";
import type {
  CompanyProfile,
  CompanySearchResponse,
  ExchangeListResponse,
} from "@/shared/types/company";

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

  /** Company discovery — search by name or ticker with filters. */
  searchCompanies(params: {
    q?: string;
    exchange?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<CompanySearchResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.exchange) query.set("exchange", params.exchange);
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 25));
    return this.request<CompanySearchResponse>(
      `/companies/search?${query.toString()}`,
    );
  }

  /** Full profile for a single listing, keyed by ticker. */
  getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    return this.request<CompanyProfile>(
      `/companies/${encodeURIComponent(ticker)}`,
    );
  }

  /** Supported exchanges with coverage counts. */
  getExchanges(): Promise<ExchangeListResponse> {
    return this.request<ExchangeListResponse>("/companies/exchanges");
  }
}

export const apiClient = new ApiClient();
