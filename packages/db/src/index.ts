import { PrismaClient } from '@prisma/client';

export * from './client';

declare global {
  // Reuse the Prisma client across hot-reloads in dev (Next.js / tsx watch).

  var __levelup_prisma__: PrismaClient | undefined;
}

const log =
  process.env.NODE_ENV === 'production'
    ? (['error', 'warn'] as const)
    : (['error', 'warn'] as const);

export const prisma: PrismaClient =
  globalThis.__levelup_prisma__ ?? new PrismaClient({ log: [...log] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__levelup_prisma__ = prisma;
}

export default prisma;
