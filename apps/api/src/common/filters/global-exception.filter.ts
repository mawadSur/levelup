import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    [key: string]: unknown;
  };
};

function getRequestId(req: Request): string {
  const header = req.headers['x-request-id'];
  return typeof header === 'string' ? header : 'unknown';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = getRequestId(req);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    const extras: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      code = exception.name ?? 'HTTP_EXCEPTION';

      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const obj = responseBody as Record<string, unknown>;

        if (typeof obj['code'] === 'string') {
          code = obj['code'];
        }
        if ('message' in obj) {
          const raw = obj['message'];
          message = Array.isArray(raw) ? raw.join('; ') : String(raw);
        }
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'code' || key === 'message' || key === 'statusCode' || key === 'error') {
            continue;
          }
          extras[key] = value;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack, 'GlobalExceptionFilter');
    } else {
      // Non-Error throw (e.g. `throw {...}` from a transient dep, a string,
      // null, etc.). `String({...})` produces "[object Object]" which has
      // zero forensic value; JSON.stringify gives us the actual payload when
      // it's serialisable. We keep the user-facing `message` as the default
      // "An unexpected error occurred" so unsanitised internals do not leak
      // to the response, but we attach a `cause` extra so the failure shows
      // up usefully in /admin/ops/recent-errors and Render stdout.
      let detail: string;
      if (exception === null || exception === undefined) {
        detail = String(exception);
      } else if (typeof exception === 'object') {
        try {
          detail = JSON.stringify(exception);
        } catch {
          detail = '[unserialisable thrown object]';
        }
      } else {
        detail = String(exception);
      }
      this.logger.error(`Non-Error throw: ${detail}`, undefined, 'GlobalExceptionFilter');
      extras['cause'] = detail.slice(0, 500);
    }

    const body: ErrorBody = {
      error: { code, message, requestId, ...extras },
    };

    res.status(status).json(body);
  }
}
