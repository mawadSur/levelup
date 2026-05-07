import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const handlers = [
  // Default: 200 with empty body for any GET. Tests override per-case.
];

export const server = setupServer(...handlers);
export { http, HttpResponse, API_BASE };
