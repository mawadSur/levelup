import { v4 as uuidV4 } from 'uuid';
import { Request } from 'express';

const HEADER = 'x-request-id';

function generateId(): string {
  return uuidV4();
}

export function getOrCreateRequestId(req: Request): string {
  const existing = req.headers[HEADER];
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  const id = generateId();
  req.headers[HEADER] = id;
  return id;
}
