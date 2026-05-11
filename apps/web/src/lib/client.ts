const CLIENT_RAW = (process.env.NEXT_PUBLIC_CLIENT ?? '').toLowerCase().trim();

export type ClientName = 'kapitus' | 'default';

export const CLIENT: ClientName = CLIENT_RAW === 'kapitus' ? 'kapitus' : 'default';
export const IS_KAPITUS = CLIENT === 'kapitus';

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
};

export const brand: Brand = BRANDS[CLIENT];
