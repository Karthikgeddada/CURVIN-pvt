/**
 * Uniform error shape for all failures surfaced by the API client,
 * mirroring the backend error envelope { error: { code, message } }.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
