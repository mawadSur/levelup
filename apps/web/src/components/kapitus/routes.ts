import { IS_KAPITUS } from '@/lib/client';

const PREFIX = IS_KAPITUS ? '' : '/clients/kapitus';

export const kRoutes = {
  home: PREFIX || '/',
  signIn: `${PREFIX}/sign-in`,
  signUp: `${PREFIX}/sign-up`,
  hero: `${PREFIX}/#hero`,
  howItWorks: `${PREFIX}/#how-it-works`,
  evidence: `${PREFIX}/#evidence`,
  pricing: `${PREFIX}/#pricing`,
};
