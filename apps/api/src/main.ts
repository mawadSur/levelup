// Must be the first import so OTel patches Node core before any framework loads.
import './observability/start';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { type Request, type Response, type NextFunction, json, raw } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.use('/api/webhooks/stripe', raw({ type: 'application/json', limit: '2mb' }));
  // Slack webhook endpoints (events, commands, interactivity) need the EXACT
  // raw bytes preserved on req.rawBody so SlackSignatureGuard can recompute
  // the HMAC. We register an express.raw() handler that accepts both JSON
  // and urlencoded bodies and re-parses them downstream inside the
  // controller. This mirrors the Stripe carve-out above.
  const rawSlack = raw({ type: '*/*', limit: '2mb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api/integrations/slack/events') ||
      req.path.startsWith('/api/integrations/slack/commands') ||
      req.path.startsWith('/api/integrations/slack/interactivity')
    ) {
      return rawSlack(req, res, (err) => {
        if (err) return next(err);
        // express.raw stores the buffer at req.body. Move to req.rawBody so
        // both names work (the SlackSignatureGuard reads rawBody, parsing
        // happens inline in the controller via Buffer.toString + parsers).
        const reqAny = req as Request & { rawBody?: Buffer };
        if (Buffer.isBuffer(req.body)) {
          reqAny.rawBody = req.body;
        }
        next();
      });
    }
    return next();
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/webhooks/stripe')) return next();
    if (
      req.path.startsWith('/api/integrations/slack/events') ||
      req.path.startsWith('/api/integrations/slack/commands') ||
      req.path.startsWith('/api/integrations/slack/interactivity')
    ) {
      // Already handled above; req.rawBody is set, req.body is the Buffer
      // until the controller decodes it. Skip the global JSON parser.
      return next();
    }
    return json({ limit: '2mb' })(req, res, next);
  });
  app.use(cookieParser());

  const webOriginEnv = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';
  const origins = webOriginEnv.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const requestLogger = new RequestLoggerMiddleware(logger);
  app.use(requestLogger.use.bind(requestLogger));

  if (process.env['NODE_ENV'] !== 'production') {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LevelUp AI Academy API')
      .setDescription('API for LevelUp AI Academy')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env['API_PORT'] ?? 4000;
  await app.listen(port);
  logger.log(`Server listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
