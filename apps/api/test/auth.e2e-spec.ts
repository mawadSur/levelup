/**
 * e2e — requires running infrastructure
 *
 * Run with:
 *   pnpm db:migrate && pnpm --filter @levelup/api test:e2e
 *
 * Prerequisites:
 *  - DATABASE_URL pointed at a clean test Postgres database.
 *  - All PLACEHOLDER_ stub keys pre-set (see env setup below).
 *
 * The auth flow runs in stub mode (SUPABASE_URL=PLACEHOLDER_), so the
 * dev-bypass endpoint mints a Supabase-shaped JWT signed with the local
 * stub secret. The same stub secret is used by `verifyAccessToken`, so the
 * /me round-trip succeeds without any real Supabase project.
 */

// ---------------------------------------------------------------------------
// Env setup — must happen before any module is imported
// ---------------------------------------------------------------------------
process.env['OPENAI_API_KEY'] = 'PLACEHOLDER_test';
process.env['STRIPE_SECRET_KEY'] = 'PLACEHOLDER_test';
process.env['STRIPE_WEBHOOK_SECRET'] = 'PLACEHOLDER_webhook';
process.env['SUPABASE_URL'] = 'PLACEHOLDER_supabase_url';
process.env['SUPABASE_ANON_KEY'] = 'PLACEHOLDER_supabase_anon';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'PLACEHOLDER_supabase_service_role';
process.env['COOKIE_DOMAIN'] = 'localhost';
process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
process.env['NODE_ENV'] = 'test';

// ---------------------------------------------------------------------------

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppLogger } from '../src/common/logger/app-logger.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const logger = app.get(AppLogger);
    app.useLogger(logger);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter(logger));

    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('returns 200 without authentication', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('GET /api/auth/me (unauthenticated)', () => {
    it('returns 401 when no Authorization header is present', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('GET /api/auth/dev-bypass', () => {
    it('returns 200 with a Supabase-shaped accessToken', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/dev-bypass?email=e2e-test@example.com')
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.split('.')).toHaveLength(3);
      expect(res.body).toHaveProperty('redirectTo');
    });
  });

  describe('auth round-trip', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/dev-bypass?email=e2e-roundtrip@example.com')
        .expect(200);
      accessToken = res.body.accessToken;
    });

    it('GET /api/auth/me with Bearer token returns flat user details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'e2e-roundtrip@example.com',
      });
      expect(res.body).toHaveProperty('organizationName');
      expect(res.body).toHaveProperty('aiLevel');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role');
    });

    it('POST /api/auth/sign-out returns 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({ ok: true });
    });
  });
});
