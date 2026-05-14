/**
 * seed-skills.ts — EXPANSION #1 Skill graph seed.
 *
 * Idempotent. Seeds ~12 global core skills (organizationId = null) and tags
 * every existing lesson + lab via slug-pattern inference. Safe to re-run on
 * every `pnpm db:seed`. Newly-authored content can be tagged by re-running
 * after the lesson/lab rows land.
 */

import type { PrismaClient } from '@prisma/client';

interface SkillSpec {
  slug: string;
  name: string;
  description: string;
  tier: 'BEGINNER' | 'PRACTITIONER' | 'POWER_USER' | 'CHAMPION';
  prerequisites: string[];
}

const CORE_SKILLS: SkillSpec[] = [
  {
    slug: 'prompt-engineering-basics',
    name: 'Prompt Engineering Basics',
    description: 'Crafting clear, structured prompts that produce reliable, on-task output.',
    tier: 'BEGINNER',
    prerequisites: [],
  },
  {
    slug: 'pii-redaction',
    name: 'PII Redaction',
    description: 'Identifying and replacing personally-identifying data with safe placeholders.',
    tier: 'PRACTITIONER',
    prerequisites: ['data-classification'],
  },
  {
    slug: 'prompt-injection-defense',
    name: 'Prompt Injection Defense',
    description: 'Detecting and refusing attempts to override system instructions.',
    tier: 'PRACTITIONER',
    prerequisites: ['prompt-engineering-basics'],
  },
  {
    slug: 'citation-verification',
    name: 'Citation Verification',
    description: 'Validating that AI-cited authorities exist and say what the model claims.',
    tier: 'PRACTITIONER',
    prerequisites: ['prompt-engineering-basics'],
  },
  {
    slug: 'policy-compliance',
    name: 'Policy Compliance',
    description: 'Recognising and applying internal AI-use policies when working with AI tools.',
    tier: 'BEGINNER',
    prerequisites: [],
  },
  {
    slug: 'legal-research',
    name: 'Legal Research',
    description: 'Using AI as a starting point for legal research without over-relying on it.',
    tier: 'POWER_USER',
    prerequisites: ['citation-verification'],
  },
  {
    slug: 'demand-letter-drafting',
    name: 'Demand Letter Drafting',
    description: 'Producing on-tone, fact-anchored demand letters with AI assistance.',
    tier: 'POWER_USER',
    prerequisites: ['prompt-engineering-basics', 'citation-verification'],
  },
  {
    slug: 'intake-fact-capture',
    name: 'Intake Fact Capture',
    description: 'Structuring open-ended client conversations into clean factual records.',
    tier: 'PRACTITIONER',
    prerequisites: ['prompt-engineering-basics'],
  },
  {
    slug: 'marketing-rule-compliance',
    name: 'Marketing-Rule Compliance',
    description: 'Keeping AI-generated marketing copy inside professional-conduct and ad rules.',
    tier: 'PRACTITIONER',
    prerequisites: ['policy-compliance'],
  },
  {
    slug: 'coaching-1on1',
    name: 'Coaching 1:1s',
    description: 'Using AI to prep manager conversations without leaking personnel data.',
    tier: 'POWER_USER',
    prerequisites: ['pii-redaction'],
  },
  {
    slug: 'data-classification',
    name: 'Data Classification',
    description: 'Sorting inputs into safe-to-paste vs. high-risk before they reach a model.',
    tier: 'BEGINNER',
    prerequisites: [],
  },
  {
    slug: 'risk-judgment',
    name: 'Risk Judgment',
    description: 'Deciding when an AI output is good enough to ship vs. needs human escalation.',
    tier: 'CHAMPION',
    prerequisites: ['policy-compliance', 'data-classification'],
  },
];

/**
 * Slug-substring → array of skill slugs. First match wins for the primary
 * tag; secondary tags listed afterwards are also applied so a multi-topic
 * lesson can teach more than one skill.
 *
 * Order matters — earlier entries are evaluated first, so more-specific
 * substrings (e.g. `pii-redaction`) sit ahead of broader ones (e.g. `pii`).
 */
const SLUG_TAG_RULES: Array<{ test: (slug: string, title?: string) => boolean; skills: string[] }> =
  [
    {
      test: (s) => s.includes('pii-redaction') || s.includes('redact'),
      skills: ['pii-redaction', 'data-classification'],
    },
    {
      test: (s) => s.includes('prompt-injection') || s.includes('injection-defense'),
      skills: ['prompt-injection-defense', 'risk-judgment'],
    },
    {
      test: (s) => s.includes('citation') || s.includes('verify'),
      skills: ['citation-verification', 'risk-judgment'],
    },
    { test: (s) => s.includes('demand-letter'), skills: ['demand-letter-drafting'] },
    {
      test: (s) => s.includes('intake') || s.includes('fact-capture'),
      skills: ['intake-fact-capture'],
    },
    {
      test: (s) =>
        s.includes('marketing') ||
        s.includes('campaign') ||
        s.includes('geo-page') ||
        s.includes('review-response'),
      skills: ['marketing-rule-compliance'],
    },
    {
      test: (s) =>
        s.includes('coaching') ||
        s.includes('feedback') ||
        s.includes('perf-review') ||
        s.includes('meeting-summar') ||
        s.includes('decision-memo'),
      skills: ['coaching-1on1'],
    },
    {
      test: (s) =>
        s.includes('compliance') ||
        s.includes('glba') ||
        s.includes('ecoa') ||
        s.includes('fcra') ||
        s.includes('cfpb'),
      skills: ['policy-compliance'],
    },
    { test: (s) => s.includes('policy'), skills: ['policy-compliance'] },
    {
      test: (s) => s.includes('lending') || s.includes('loan-officer') || s.includes('underwrit'),
      skills: ['risk-judgment', 'data-classification'],
    },
    {
      test: (s) => s.includes('legal') || s.includes('paralegal'),
      skills: ['legal-research', 'citation-verification'],
    },
    {
      test: (s) =>
        s.includes('prompt') ||
        s.includes('prompting') ||
        s.includes('few-shot') ||
        s.includes('chain-of-thought') ||
        s.includes('refinement') ||
        s.includes('structured-output') ||
        s.includes('anatomy'),
      skills: ['prompt-engineering-basics'],
    },
    {
      test: (s) =>
        s.includes('what-ai') ||
        s.includes('safe-use') ||
        s.includes('common-mistakes') ||
        s.includes('verifying'),
      skills: ['data-classification', 'risk-judgment'],
    },
    { test: (s) => s.includes('data-class'), skills: ['data-classification'] },
    {
      test: (s) =>
        s.includes('sales') ||
        s.includes('cold-email') ||
        s.includes('account-research') ||
        s.includes('objection') ||
        s.includes('proposal') ||
        s.includes('prospect') ||
        s.includes('crm'),
      skills: ['prompt-engineering-basics', 'data-classification'],
    },
    { test: (s) => s.includes('summar'), skills: ['prompt-engineering-basics'] },
    {
      test: (s) =>
        s.includes('comms') ||
        s.includes('customer-comms') ||
        s.includes('complaint') ||
        s.includes('plain-english') ||
        s.includes('collections'),
      skills: ['policy-compliance', 'prompt-engineering-basics'],
    },
    {
      test: (s) =>
        s.includes('hr') ||
        s.includes('interview') ||
        s.includes('job-description') ||
        s.includes('onboarding') ||
        s.includes('employee'),
      skills: ['policy-compliance'],
    },
    {
      test: (s) =>
        s.includes('support') ||
        s.includes('escalation') ||
        s.includes('help-center') ||
        s.includes('ticket'),
      skills: ['policy-compliance', 'prompt-engineering-basics'],
    },
    {
      test: (s) => s.includes('kapitus') || s.includes('welcome') || s.includes('approved-tools'),
      skills: ['policy-compliance', 'data-classification'],
    },
  ];

function inferSkills(slug: string, title?: string): string[] {
  const tagged = new Set<string>();
  for (const rule of SLUG_TAG_RULES) {
    if (rule.test(slug, title)) {
      rule.skills.forEach((s) => tagged.add(s));
    }
    // Cap any single content row at two skills — the heaviest signal.
    if (tagged.size >= 2) break;
  }
  return Array.from(tagged);
}

export interface SeedSkillsResult {
  skillsUpserted: number;
  lessonSkillLinks: number;
  labSkillLinks: number;
}

/**
 * Seed the global core skill graph and tag every existing lesson + lab.
 *
 * Pass the demo `org.id` so the caller's audit trail can attribute the
 * write, but the skills themselves stay `organizationId = null` so every
 * tenant sees them.
 */
export async function seedSkills(prisma: PrismaClient, _orgId: string): Promise<SeedSkillsResult> {
  let skillsUpserted = 0;
  for (const spec of CORE_SKILLS) {
    await prisma.skill.upsert({
      where: { slug: spec.slug },
      update: {
        name: spec.name,
        description: spec.description,
        tier: spec.tier,
        prerequisites: spec.prerequisites,
      },
      create: {
        organizationId: null,
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        tier: spec.tier,
        prerequisites: spec.prerequisites,
      },
    });
    skillsUpserted += 1;
  }

  const allSkills = await prisma.skill.findMany({
    where: { slug: { in: CORE_SKILLS.map((s) => s.slug) } },
    select: { id: true, slug: true },
  });
  const skillIdBySlug = new Map(allSkills.map((s) => [s.slug, s.id] as const));

  const lessons = await prisma.lesson.findMany({
    select: { id: true, slug: true, title: true },
  });
  let lessonSkillLinks = 0;
  for (const lesson of lessons) {
    const tags = inferSkills(lesson.slug, lesson.title);
    for (const slug of tags) {
      const skillId = skillIdBySlug.get(slug);
      if (!skillId) continue;
      await prisma.lessonSkill.upsert({
        where: { lessonId_skillId: { lessonId: lesson.id, skillId } },
        update: { weight: 1.0 },
        create: { lessonId: lesson.id, skillId, weight: 1.0 },
      });
      lessonSkillLinks += 1;
    }
  }

  const labs = await prisma.lab.findMany({ select: { id: true, slug: true, title: true } });
  let labSkillLinks = 0;
  for (const lab of labs) {
    const tags = inferSkills(lab.slug, lab.title);
    for (const slug of tags) {
      const skillId = skillIdBySlug.get(slug);
      if (!skillId) continue;
      await prisma.labSkill.upsert({
        where: { labId_skillId: { labId: lab.id, skillId } },
        update: { weight: 1.0 },
        create: { labId: lab.id, skillId, weight: 1.0 },
      });
      labSkillLinks += 1;
    }
  }

  return { skillsUpserted, lessonSkillLinks, labSkillLinks };
}
