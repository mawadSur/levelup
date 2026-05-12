import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient, Role, AiLevel, Plan } from '@prisma/client';

const prisma = new PrismaClient();

type SeedQuestion = {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
};

type SeedLesson = {
  title: string;
  slug: string;
  body: string;
  estimatedMinutes: number;
  questions: SeedQuestion[];
};

type SeedPath = {
  title: string;
  slug: string;
  description: string;
  targetRole: Role | null;
  targetLevel: AiLevel;
  tier: AiLevel;
  isCore: boolean;
  prerequisiteSlugs: string[];
  orderIndex: number;
  lessons: SeedLesson[];
};

// File-driven paths under packages/db/content/<slug>/ — for paths authored as
// markdown lessons + JSON quizzes (the Kapitus academy curriculum). Added in
// order they should appear in the catalog.
const FILE_PATH_SLUGS = [
  'kapitus-foundations',
  'ai-customer-comms',
  'ai-lending',
  'ai-underwriting',
  'ai-compliance',
  'prompt-engineering',
] as const;

interface MarkdownLessonFrontmatter {
  slug: string;
  title: string;
  estimatedMinutes: number;
  orderIndex: number;
}

function parseFrontmatter(raw: string): { frontmatter: MarkdownLessonFrontmatter; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Lesson markdown is missing YAML frontmatter');
  }
  const yaml = match[1] ?? '';
  const body = (match[2] ?? '').trim();
  const fields: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  }
  const slug = fields.slug;
  const title = fields.title;
  if (!slug || !title) {
    throw new Error('Lesson frontmatter must include `slug` and `title`');
  }
  return {
    frontmatter: {
      slug,
      title,
      estimatedMinutes: parseInt(fields.estimatedMinutes ?? '8', 10) || 8,
      orderIndex: parseInt(fields.orderIndex ?? '0', 10) || 0,
    },
    body,
  };
}

function loadPathFromContent(slug: string): SeedPath {
  const dir = path.join(__dirname, '..', 'content', slug);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'path.json'), 'utf8')) as {
    title: string;
    slug: string;
    description: string;
    targetRole: string | null;
    targetLevel: string;
    tier?: string;
    isCore?: boolean;
    prerequisiteSlugs?: string[];
    orderIndex?: number;
  };

  const lessonFiles = fs
    .readdirSync(path.join(dir, 'lessons'))
    .filter((f) => f.endsWith('.md'))
    .sort();

  const lessons: SeedLesson[] = lessonFiles.map((file) => {
    const raw = fs.readFileSync(path.join(dir, 'lessons', file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);

    // Quiz lives at quizzes/<same-stem>.json
    const stem = file.replace(/\.md$/, '');
    const quizFile = path.join(dir, 'quizzes', `${stem}.json`);
    const quizRaw = JSON.parse(fs.readFileSync(quizFile, 'utf8')) as {
      questions: Array<{
        prompt: string;
        choices: string[];
        correctIndex: number;
        explanation?: string;
      }>;
    };

    return {
      title: frontmatter.title,
      slug: frontmatter.slug,
      body,
      estimatedMinutes: frontmatter.estimatedMinutes,
      questions: quizRaw.questions.map((q) => ({
        prompt: q.prompt,
        choices: q.choices,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
    };
  });

  return {
    title: meta.title,
    slug: meta.slug,
    description: meta.description,
    targetRole: meta.targetRole as Role | null,
    targetLevel: meta.targetLevel as AiLevel,
    tier: (meta.tier ?? meta.targetLevel) as AiLevel,
    isCore: meta.isCore ?? false,
    prerequisiteSlugs: meta.prerequisiteSlugs ?? [],
    orderIndex: meta.orderIndex ?? 99,
    lessons,
  };
}

const PATHS: SeedPath[] = [
  {
    title: 'AI Basics for Every Employee',
    slug: 'ai-basics',
    description: 'Foundations every employee needs to use AI safely and effectively.',
    targetRole: null,
    targetLevel: AiLevel.BEGINNER,
    tier: AiLevel.BEGINNER,
    isCore: true,
    prerequisiteSlugs: [],
    orderIndex: 0,
    lessons: [
      {
        title: 'What is generative AI?',
        slug: 'what-is-generative-ai',
        body: '# What is generative AI?\n\nGenerative AI produces new text, images, code, and audio from prompts.',
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'Generative AI primarily produces:',
            choices: [
              'Spreadsheets only',
              'New content from prompts',
              'Database indexes',
              'Network packets',
            ],
            correctIndex: 1,
            explanation: 'Generative models output new content given a prompt.',
          },
          {
            prompt: 'A "prompt" is:',
            choices: [
              'A bug',
              'An input instruction to the model',
              'A type of CPU',
              'A subscription tier',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Prompting fundamentals',
        slug: 'prompting-fundamentals',
        body: '# Prompting fundamentals\n\nGive context, role, task, format, and constraints.',
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'A high-quality prompt usually includes:',
            choices: [
              'Only a question',
              'Role + task + constraints',
              'A password',
              'A model checkpoint',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'Specifying output format helps because:',
            choices: [
              'It hides the answer',
              'It makes parsing easier',
              'It costs more',
              'It is required',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Verifying AI output',
        slug: 'verifying-ai-output',
        body: '# Verifying AI output\n\nAlways check facts, citations, and numbers before acting.',
        estimatedMinutes: 7,
        questions: [
          {
            prompt: 'AI hallucinations are:',
            choices: ['Confident wrong answers', 'Server errors', 'Emoji renders', 'A jailbreak'],
            correctIndex: 0,
          },
          {
            prompt: 'Best mitigation for hallucinations is:',
            choices: [
              'Trust by default',
              'Verify against sources',
              'Increase temperature',
              'Use shorter prompts',
            ],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Sales Teams',
    slug: 'ai-for-sales',
    description: 'Use AI to personalize outreach, qualify leads, and shorten the sales cycle.',
    targetRole: Role.EMPLOYEE,
    targetLevel: AiLevel.PRACTITIONER,
    tier: AiLevel.PRACTITIONER,
    isCore: false,
    prerequisiteSlugs: ['ai-basics', 'kapitus-foundations'],
    orderIndex: 14,
    lessons: [
      {
        title: 'Personalized outreach at scale',
        slug: 'personalized-outreach',
        body: '# Personalized outreach\n\nResearch each prospect, then have AI draft tailored notes.',
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'Best practice for AI-drafted outreach:',
            choices: ['Send unedited', 'Personalize and review', 'Skip subject line', 'Spam'],
            correctIndex: 1,
          },
          {
            prompt: 'Where should you NOT paste prospect data:',
            choices: [
              'An approved enterprise tool',
              'Public free chatbots',
              'Your CRM',
              'Internal notes',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Qualifying leads with AI',
        slug: 'qualifying-leads',
        body: '# Qualifying leads\n\nUse AI to summarize public signals and rank fit.',
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'A good lead-qualification prompt includes:',
            choices: ['ICP criteria', 'Random emojis', 'Your password', 'Nothing'],
            correctIndex: 0,
          },
          {
            prompt: 'AI scores should be treated as:',
            choices: ['Final decisions', 'A guidance signal', 'Legal advice', 'Truth'],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Call summaries and follow-ups',
        slug: 'call-summaries',
        body: '# Call summaries\n\nTranscribe with consent, summarize, draft follow-ups.',
        estimatedMinutes: 7,
        questions: [
          {
            prompt: 'Before recording a call you must:',
            choices: ['Get consent', 'Mute the prospect', 'Hide your name', 'Disable AI'],
            correctIndex: 0,
          },
          {
            prompt: 'AI follow-ups should:',
            choices: [
              'Be sent unread',
              'Be reviewed and personalized',
              'Always be templated',
              'Never include numbers',
            ],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Managers',
    slug: 'ai-for-managers',
    description: 'Lead a team that adopts AI safely and measurably.',
    targetRole: Role.MANAGER,
    targetLevel: AiLevel.POWER_USER,
    tier: AiLevel.POWER_USER,
    isCore: false,
    prerequisiteSlugs: ['ai-basics', 'kapitus-foundations'],
    orderIndex: 15,
    lessons: [
      {
        title: 'Setting an AI policy',
        slug: 'setting-an-ai-policy',
        body: '# Setting an AI policy\n\nApproved tools, data classes, escalation paths.',
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'A good AI policy specifies:',
            choices: [
              'Only banned tools',
              'Approved tools and data rules',
              'Manager bonuses',
              'Office hours',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'Sensitive data should be:',
            choices: [
              'Pasted everywhere',
              'Restricted to approved tools',
              'Encrypted with PGP only',
              'Public',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Coaching AI adoption',
        slug: 'coaching-adoption',
        body: '# Coaching adoption\n\nMeet teams where they are; pair power users with beginners.',
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'Adoption stalls most when:',
            choices: [
              'Tools are too cheap',
              'Workflows are unclear',
              'Too many trainings',
              'Models are accurate',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'A good metric is:',
            choices: [
              'Hours saved per week',
              'Number of tabs open',
              'Slack messages',
              'Office attendance',
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        title: 'Risk and compliance basics',
        slug: 'risk-and-compliance',
        body: '# Risk and compliance\n\nKnow your data classes and incident path.',
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'PII pasted into a public chatbot is:',
            choices: ['Fine', 'A potential incident', 'A compliment', 'Required'],
            correctIndex: 1,
          },
          {
            prompt: 'Audit logs help by:',
            choices: [
              'Slowing teams',
              'Tracing what happened',
              'Replacing training',
              'Hiding bugs',
            ],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
];

async function main() {
  const isKapitus = (process.env.CLIENT ?? '').toLowerCase() === 'kapitus';
  // The "demo-org" id is stable across environments; under CLIENT=kapitus it
  // doubles as the shared Kapitus org that all employees attach to. Stamp a
  // slug so the auth flow can find it without hardcoding the id.
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {
      slug: isKapitus ? 'kapitus' : 'demo',
      name: isKapitus ? 'Kapitus' : 'Demo Co',
    },
    create: {
      id: 'demo-org',
      slug: isKapitus ? 'kapitus' : 'demo',
      name: isKapitus ? 'Kapitus' : 'Demo Co',
      industry: isKapitus ? 'Financial Services' : 'Software',
      companySize: isKapitus ? '201-1000' : '51-200',
      plan: Plan.GROWTH,
      planSeats: 100,
    },
  });

  const engineering = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Engineering' } },
    update: {},
    create: { organizationId: org.id, name: 'Engineering' },
  });

  const sales = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Sales' } },
    update: {},
    create: { organizationId: org.id, name: 'Sales' },
  });

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@demo.test',
      name: 'Ada Admin',
      role: Role.ADMIN,
      jobTitle: 'Head of People',
      aiLevel: AiLevel.POWER_USER,
      departmentId: engineering.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'manager@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'manager@demo.test',
      name: 'Mona Manager',
      role: Role.MANAGER,
      jobTitle: 'Sales Manager',
      aiLevel: AiLevel.PRACTITIONER,
      departmentId: sales.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'eve@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'eve@demo.test',
      name: 'Eve Employee',
      role: Role.EMPLOYEE,
      jobTitle: 'Account Executive',
      aiLevel: AiLevel.BEGINNER,
      departmentId: sales.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'ed@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'ed@demo.test',
      name: 'Ed Employee',
      role: Role.EMPLOYEE,
      jobTitle: 'Software Engineer',
      aiLevel: AiLevel.PRACTITIONER,
      departmentId: engineering.id,
    },
  });

  // Combine hardcoded baseline paths with the file-driven Kapitus academy
  // paths so the same upsert loop handles both. Idempotent — re-running the
  // seed updates lesson bodies + quiz questions in place.
  const filePaths: SeedPath[] = FILE_PATH_SLUGS.map((slug) => loadPathFromContent(slug));
  const allPaths: SeedPath[] = [...PATHS, ...filePaths];

  for (const path of allPaths) {
    const created = await prisma.learningPath.upsert({
      where: {
        organizationId_slug: { organizationId: org.id, slug: path.slug },
      },
      update: {
        title: path.title,
        description: path.description,
        isPublished: true,
        tier: path.tier,
        isCore: path.isCore,
        prerequisiteSlugs: path.prerequisiteSlugs,
        orderIndex: path.orderIndex,
      },
      create: {
        organizationId: org.id,
        title: path.title,
        slug: path.slug,
        description: path.description,
        targetRole: path.targetRole,
        targetLevel: path.targetLevel,
        tier: path.tier,
        isCore: path.isCore,
        prerequisiteSlugs: path.prerequisiteSlugs,
        orderIndex: path.orderIndex,
        isPublished: true,
      },
    });

    for (let i = 0; i < path.lessons.length; i++) {
      const lessonSpec = path.lessons[i]!;
      const lesson = await prisma.lesson.upsert({
        where: {
          learningPathId_slug: { learningPathId: created.id, slug: lessonSpec.slug },
        },
        update: { title: lessonSpec.title, body: lessonSpec.body },
        create: {
          learningPathId: created.id,
          title: lessonSpec.title,
          slug: lessonSpec.slug,
          body: lessonSpec.body,
          estimatedMinutes: lessonSpec.estimatedMinutes,
          orderIndex: i,
        },
      });

      const existingQuiz = await prisma.quiz.findFirst({ where: { lessonId: lesson.id } });
      const quiz =
        existingQuiz ??
        (await prisma.quiz.create({
          data: { lessonId: lesson.id, title: `${lessonSpec.title} — quiz` },
        }));

      const questionCount = await prisma.quizQuestion.count({ where: { quizId: quiz.id } });
      if (questionCount === 0) {
        await prisma.quizQuestion.createMany({
          data: lessonSpec.questions.map((q, idx) => ({
            quizId: quiz.id,
            prompt: q.prompt,
            choices: q.choices,
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? null,
            orderIndex: idx,
          })),
        });
      }
    }

    for (const userId of [employee1.id, employee2.id]) {
      await prisma.learningPathAssignment.upsert({
        where: { learningPathId_userId: { learningPathId: created.id, userId } },
        update: {},
        create: {
          learningPathId: created.id,
          userId,
          assignedById: admin.id,
        },
      });
    }
  }

  // ── Global assessment-item bank ───────────────────────────────────────────
  // Items are global (organizationId = null) so every tenant samples from the
  // same bank. Idempotent: matched by prompt text.
  const bankPath = path.join(__dirname, '..', 'content', 'assessment-bank', 'items.json');
  const bankItems: Array<{
    prompt: string;
    choices: string[];
    correctIndex: number;
    level: AiLevel;
    category: string;
  }> = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  let bankCreated = 0;
  for (const item of bankItems) {
    const existing = await prisma.assessmentItem.findFirst({
      where: { organizationId: null, prompt: item.prompt },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.assessmentItem.create({
      data: {
        organizationId: null,
        prompt: item.prompt,
        choices: item.choices,
        correctIndex: item.correctIndex,
        level: item.level,
        category: item.category,
      },
    });
    bankCreated += 1;
  }

  // ── Kapitus mode: consolidate personal-org signups into the shared org ──
  // Before the white-label rollout, every signup got `<Name>'s Organization`
  // and saw an empty curriculum. Move those users + their data into the
  // shared Kapitus org so they pick up where they left off. Idempotent —
  // a no-op once every user is in the kapitus org.
  let reconciledUsers = 0;
  if (isKapitus) {
    const strays = await prisma.user.findMany({
      where: { organizationId: { not: org.id } },
      select: { id: true, organizationId: true, role: true, email: true },
    });
    for (const u of strays) {
      const oldOrgId = u.organizationId;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: u.id },
          data: { organizationId: org.id, role: Role.EMPLOYEE },
        }),
        prisma.assessment.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.auditLog.updateMany({
          where: { actorId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.aiCoachSession.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.conversation.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.prompt.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
      ]);
      // The orphan personal org is now data-free; delete cascades through any
      // remaining shared rows (Departments, Invitations) that were never
      // attached to a user.
      await prisma.organization.delete({ where: { id: oldOrgId } }).catch(() => {});
      reconciledUsers += 1;
    }
  }

  console.log('Seed complete:', {
    org: org.id,
    users: [admin.email, manager.email, employee1.email, employee2.email],
    paths: PATHS.map((p) => p.slug),
    assessmentItems: { created: bankCreated, total: bankItems.length },
    reconciledUsers,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
