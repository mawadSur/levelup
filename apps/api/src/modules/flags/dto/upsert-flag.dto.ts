import { upsertFlagSchema } from '@levelup/types';

export { upsertFlagSchema };
export type UpsertFlagDto = {
  key: string;
  enabled: boolean;
  rolloutPercent?: number | null;
  metadata?: Record<string, unknown> | null;
};
