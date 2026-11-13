/** Shared API contract types — kept in lockstep with the backend. */

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  version: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
