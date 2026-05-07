import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AppLogger } from '../logger/app-logger.service';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      code = exception.name ?? 'HTTP_EXCEPTION';
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'message' in responseBody
      ) {
        const raw = (responseBody as Record<string, unknown>)['message'];
        message = Array.isArray(raw) ? raw.join('; ') : String(raw);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack, 'GlobalExceptionFilter');
    } else {
      this.logger.error(String(exception), undefined, 'GlobalExceptionFilter');
    }

    const body: ErrorBody = {
      error: { code, message, requestId },
    };

    res.status(status).json(body);
  }
}
