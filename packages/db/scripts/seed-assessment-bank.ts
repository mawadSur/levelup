/**
 * Seed the global assessment-item bank into Supabase.
 *
 * The items file at content/assessment-bank/items.json holds 40 items used
 * for the baseline assessment. They're intended to be GLOBAL (organizationId
 * = null) so every tenant samples from the same bank.
 *
 * Idempotent: looks up existing items by slug + global scope and skips
 * inserts on match. Re-runs are safe.
 *
 * Run from repo root:
 *   pnpm --filter @levelup/db exec tsx scripts/seed-assessment-bank.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, AiLevel } from '@prisma/client';

interface BankItem {
  slug: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  level: keyof typeof AiLevel;
  category: string;
  explanation?: string;
}

async function main() {
  const prisma = new PrismaClient();
  const path = resolve(__dirname, '../content/assessment-bank/items.json');
  const items: BankItem[] = JSON.parse(readFileSync(path, 'utf-8'));

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    // Match by (organizationId IS NULL, prompt) — slug isn't a column on
    // AssessmentItem, only used as the source-file unique key.
    const existing = await prisma.assessmentItem.findFirst({
      where: { organizationId: null, prompt: item.prompt },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.assessmentItem.create({
      data: {
        organizationId: null, // global
        prompt: item.prompt,
        choices: item.choices,
        correctIndex: item.correctIndex,
        level: AiLevel[item.level],
        category: item.category,
      },
    });
    created += 1;
  }

  const total = await prisma.assessmentItem.count();
  console.log(`✓ assessment-bank seeded: ${created} created, ${skipped} skipped, ${total} total in DB`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
