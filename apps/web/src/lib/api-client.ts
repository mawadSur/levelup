const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiResponseError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiResponseError';
    this.statusCode = statusCode;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let errorBody: Partial<ApiError> = {};
    try {
      errorBody = (await response.json()) as Partial<ApiError>;
    } catch {
      // Response body may not be JSON
    }
    throw new ApiResponseError(
      errorBody.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
