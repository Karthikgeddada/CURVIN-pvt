import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/core/api/client";
import { ApiError } from "@/core/error-handling/ApiError";
import type { CompanySearchResponse } from "@/shared/types/company";

export interface CompanySearchParams {
  q: string;
  exchange: string;
  status: string;
  page: number;
  limit: number;
}

export type CompanySearchState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; data: CompanySearchResponse }
  | { phase: "error"; message: string; code: string };

/**
 * Executes company searches through the central API client.
 * The caller owns the debounced inputs; this hook owns fetching,
 * cancellation and state transitions.
 */
export function useCompanySearch(params: CompanySearchParams) {
  const [state, setState] = useState<CompanySearchState>({ phase: "idle" });
  const runIdRef = useRef(0);

  const execute = useCallback(async () => {
    const runId = ++runIdRef.current;
    setState({ phase: "loading" });
    try {
      const data = await apiClient.searchCompanies({
        q: params.q || undefined,
        exchange: params.exchange || undefined,
        status: params.status || undefined,
        page: params.page,
        limit: params.limit,
      });
      if (runId === runIdRef.current) setState({ phase: "ready", data });
    } catch (cause) {
      if (runId !== runIdRef.current) return;
      if (cause instanceof ApiError) {
        setState({
          phase: "error",
          message: cause.message,
          code: cause.code,
        });
      } else {
        setState({
          phase: "error",
          message: "Unexpected error while searching.",
          code: "unknown",
        });
      }
    }
  }, [params.q, params.exchange, params.status, params.page, params.limit]);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { state, retry: execute };
}
