// ---------------------------------------------------------------------------
// API error codes
// ---------------------------------------------------------------------------
export const AUTH_REQUIRED = 'AUTH_REQUIRED' as const;
export const PLAN_LIMIT = 'PLAN_LIMIT' as const;
export const NOT_FOUND = 'NOT_FOUND' as const;
export const FORBIDDEN = 'FORBIDDEN' as const;
export const VALIDATION_ERROR = 'VALIDATION_ERROR' as const;
export const CONFLICT = 'CONFLICT' as const;
export const RATE_LIMITED = 'RATE_LIMITED' as const;
export const INTERNAL_ERROR = 'INTERNAL_ERROR' as const;
export const SENSITIVE_DATA = 'SENSITIVE_DATA' as const;
export const PAYMENT_REQUIRED = 'PAYMENT_REQUIRED' as const;

export type ErrorCode =
  | typeof AUTH_REQUIRED
  | typeof PLAN_LIMIT
  | typeof NOT_FOUND
  | typeof FORBIDDEN
  | typeof VALIDATION_ERROR
  | typeof CONFLICT
  | typeof RATE_LIMITED
  | typeof INTERNAL_ERROR
  | typeof SENSITIVE_DATA
  | typeof PAYMENT_REQUIRED
  | string;

// ---------------------------------------------------------------------------
// ApiError class
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly requestId: string | undefined;

  constructor(opts: { message: string; status: number; code?: ErrorCode; requestId?: string }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code ?? INTERNAL_ERROR;
    this.requestId = opts.requestId;
  }

  get isAuthRequired(): boolean {
    return this.status === 401 || this.code === AUTH_REQUIRED;
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === NOT_FOUND;
  }

  get isPlanLimit(): boolean {
    return this.status === 402 || this.code === PLAN_LIMIT;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
