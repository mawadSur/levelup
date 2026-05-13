import { IS_CEOLAWYER } from '@/lib/client';

const PREFIX = IS_CEOLAWYER ? '' : '/clients/ceolawyer';

export const clRoutes = {
  home: PREFIX || '/',
  signIn: `${PREFIX}/sign-in`,
  signUp: `${PREFIX}/sign-up`,
  hero: `${PREFIX}/#hero`,
  howItWorks: `${PREFIX}/#how-it-works`,
  roles: `${PREFIX}/#roles`,
  valueProps: `${PREFIX}/#value-props`,
  trust: `${PREFIX}/#trust`,
  pricing: `${PREFIX}/#pricing`,
  faq: `${PREFIX}/#faq`,
  contact: 'tel:8442322724',
};
