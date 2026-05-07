import { Injectable } from '@nestjs/common';
import type { INestApplication, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@levelup/db';

// We instantiate a fresh PrismaClient here rather than re-using the global
// singleton from @levelup/db because:
//  1. The singleton's global-variable caching is designed for Next.js hot-reload,
//     not for a long-lived NestJS process.
//  2. NestJS controls the lifecycle (OnModuleInit/OnModuleDestroy), so we want
//     a dedicated connection pool that is explicitly opened and closed by the DI
//     container — not shared with any other process that might import @levelup/db.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // Hooks into Node's beforeExit signal so Prisma can drain its connection pool
  // before the process terminates (e.g. graceful K8s shutdown, SIGTERM via PM2).
  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
