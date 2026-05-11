import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { getOrCreateRequestId } from '../utils/request-id';
import type { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const reqId = getOrCreateRequestId(req);
    const startMs = Date.now();

    res.setHeader('x-request-id', reqId);

    res.on('finish', () => {
      const durationMs = Date.now() - startMs;
      this.logger.log(
        JSON.stringify({
          reqId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
        }),
        'RequestLogger',
      );
    });

    next();
  }
}
