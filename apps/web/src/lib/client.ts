// White-label client resolution. Build-time only — NEXT_PUBLIC_CLIENT is
// inlined by Next.js at build time, so changing the env on Vercel requires a
// FRESH (non-cached) build to take effect. Adjust BRANDS below + add a
// branch in the ternary below to add a tenant.
const CLIENT_RAW = (process.env.NEXT_PUBLIC_CLIENT ?? '').toLowerCase().trim();

export type ClientName = 'kapitus' | 'ceolawyer' | 'default';

export const CLIENT: ClientName =
  CLIENT_RAW === 'kapitus' ? 'kapitus' : CLIENT_RAW === 'ceolawyer' ? 'ceolawyer' : 'default';
export const IS_KAPITUS = CLIENT === 'kapitus';
export const IS_CEOLAWYER = CLIENT === 'ceolawyer';

type Brand = {
  name: string;
  shortName: string;
  description: string;
  metaTitleDefault: string;
  metaTitleTemplate: string;
  industryDefault?: string;
  themeClass?: string;
};

const BRANDS: Record<ClientName, Brand> = {
  default: {
    name: 'LevelUp AI Academy',
    shortName: 'LevelUp',
    description:
      'A role-based AI curriculum, an in-context coach, and a reporting instrument your CIO will actually open. Pilot in thirty days. Prove the ROI by week three.',
    metaTitleDefault: 'LevelUp AI Academy — Train every operator',
    metaTitleTemplate: '%s · LevelUp AI Academy',
  },
  kapitus: {
    name: 'Kapitus AI Academy',
    shortName: 'Kapitus AI Academy',
    description:
      'AI training that protects loan applicants’ data. GLBA-aligned, audit-ready, tuned for lenders, underwriters, and operations at Kapitus.',
    metaTitleDefault: 'Kapitus AI Academy — AI training with guardrails',
    metaTitleTemplate: '%s · Kapitus AI Academy',
    industryDefault: 'FINANCIAL_SERVICES',
    themeClass: 'kapitus',
  },
  ceolawyer: {
    name: 'CEO Lawyer AI Academy',
    shortName: 'CEO Lawyer AI Academy',
    description:
      'Sharpen your edge. Win more cases. AI training built for personal injury firms — confidentiality-safe, citation-checked, and tuned to how you actually serve clients.',
    metaTitleDefault: 'CEO Lawyer AI Academy — AI training for personal injury firms',
    metaTitleTemplate: '%s · CEO Lawyer AI Academy',
    industryDefault: 'LEGAL',
    themeClass: 'ceolawyer',
  },
};

export const brand: Brand = BRANDS[CLIENT];
