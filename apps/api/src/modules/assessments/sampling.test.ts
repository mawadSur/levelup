/**
 * apps/api — sampleItems unit tests
 *
 * Tests determinism, distribution counts, and error handling for the
 * mulberry32-based item sampler.
 *
 * Run: pnpm --filter @levelup/api test  (uses the jest config in package.json)
 */

import { sampleItems, SAMPLE_COUNTS } from './sampling';
import type { AssessmentItem } from '@levelup/db';
import { AiLevel, AssessmentType } from '@levelup/db';

// ---- helpers ----------------------------------------------------------------

let _idCounter = 0;
function makeItem(level: AiLevel): AssessmentItem {
  _idCounter++;
  return {
    id: `item_${_idCounter.toString().padStart(6, '0')}`,
    level,
    correctIndex: 0,
    organizationId: null,
    type: AssessmentType.BASELINE,
    question: `Question ${_idCounter}`,
    choices: ['a', 'b', 'c', 'd'],
    explanation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildBank(counts: Partial<Record<AiLevel, number>> = {}): AssessmentItem[] {
  const defaults: Record<AiLevel, number> = {
    [AiLevel.BEGINNER]: 10,
    [AiLevel.PRACTITIONER]: 12,
    [AiLevel.POWER_USER]: 11,
    [AiLevel.CHAMPION]: 9,
  };
  const merged = { ...defaults, ...counts };
  const items: AssessmentItem[] = [];
  for (const level of Object.values(AiLevel)) {
    for (let i = 0; i < (merged[level] ?? 0); i++) {
      items.push(makeItem(level));
    }
  }
  return items;
}

const TEST_USER = 'user_test_001';
const TEST_TYPE = AssessmentType.BASELINE;
const TEST_DATE = '2025-01-15';

// ============================================================================
// Tests
// ============================================================================

describe('sampleItems', () => {
  // --------------------------------------------------------------------------
  // Determinism
  // --------------------------------------------------------------------------
  describe('determinism', () => {
    it('same seed produces identical item sets', () => {
      const bank = buildBank();
      const r1 = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      const r2 = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      expect(r1.items.map((i) => i.id)).toEqual(r2.items.map((i) => i.id));
    });

    it('same seed produces the same sessionId fingerprint', () => {
      const bank = buildBank();
      const r1 = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      const r2 = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      expect(r1.sessionId).toBe(r2.sessionId);
    });

    it('different user seed → likely different items', () => {
      const bank = buildBank();
      const r1 = sampleItems(bank, 'user_alice', TEST_TYPE, TEST_DATE);
      const r2 = sampleItems(bank, 'user_bob', TEST_TYPE, TEST_DATE);
      // Different users on the same day should (almost certainly) get a different order
      const sameIds = r1.items.every((item, i) => item.id === r2.items[i]?.id);
      expect(sameIds).toBe(false);
    });

    it('different date seed → likely different items', () => {
      const bank = buildBank();
      const r1 = sampleItems(bank, TEST_USER, TEST_TYPE, '2025-01-15');
      const r2 = sampleItems(bank, TEST_USER, TEST_TYPE, '2025-01-16');
      const sameIds = r1.items.every((item, i) => item.id === r2.items[i]?.id);
      expect(sameIds).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Count distribution: 7/9/8/6 per level
  // --------------------------------------------------------------------------
  describe('count distribution', () => {
    it('samples exactly SAMPLE_COUNTS per level', () => {
      const bank = buildBank();
      const { items } = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);

      const countByLevel: Record<AiLevel, number> = {
        [AiLevel.BEGINNER]: 0,
        [AiLevel.PRACTITIONER]: 0,
        [AiLevel.POWER_USER]: 0,
        [AiLevel.CHAMPION]: 0,
      };
      for (const item of items) {
        countByLevel[item.level] += 1;
      }

      expect(countByLevel[AiLevel.BEGINNER]).toBe(SAMPLE_COUNTS[AiLevel.BEGINNER]);
      expect(countByLevel[AiLevel.PRACTITIONER]).toBe(SAMPLE_COUNTS[AiLevel.PRACTITIONER]);
      expect(countByLevel[AiLevel.POWER_USER]).toBe(SAMPLE_COUNTS[AiLevel.POWER_USER]);
      expect(countByLevel[AiLevel.CHAMPION]).toBe(SAMPLE_COUNTS[AiLevel.CHAMPION]);
    });

    it('returns exactly 30 items in total', () => {
      const bank = buildBank();
      const { items } = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      const expectedTotal = Object.values(SAMPLE_COUNTS).reduce((a, b) => a + b, 0);
      expect(items).toHaveLength(expectedTotal);
      expect(expectedTotal).toBe(30);
    });
  });

  // --------------------------------------------------------------------------
  // Error: bank too small
  // --------------------------------------------------------------------------
  describe('bank too small', () => {
    it('throws InternalServerErrorException when BEGINNER bank is insufficient', () => {
      // Only 5 BEGINNER items but 7 are required
      const bank = buildBank({ [AiLevel.BEGINNER]: 5 });
      expect(() => sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE)).toThrow();
    });

    it('throws when any single level is short', () => {
      const bank = buildBank({ [AiLevel.CHAMPION]: 3 }); // needs 6
      expect(() => sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE)).toThrow();
    });

    it('throws with a message indicating which level is short', () => {
      const bank = buildBank({ [AiLevel.BEGINNER]: 5 });
      let errorMessage = '';
      try {
        sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      } catch (err: unknown) {
        if (err instanceof Error) errorMessage = err.message;
      }
      expect(errorMessage.toLowerCase()).toContain('beginner');
    });
  });

  // --------------------------------------------------------------------------
  // sessionId fingerprint
  // --------------------------------------------------------------------------
  describe('sessionId', () => {
    it('returns a non-empty sessionId string', () => {
      const bank = buildBank();
      const { sessionId } = sampleItems(bank, TEST_USER, TEST_TYPE, TEST_DATE);
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('sessionId changes when item set changes (different bank)', () => {
      const bank1 = buildBank();
      const bank2 = buildBank(); // new IDs because _idCounter advances
      const r1 = sampleItems(bank1, TEST_USER, TEST_TYPE, TEST_DATE);
      const r2 = sampleItems(bank2, TEST_USER, TEST_TYPE, TEST_DATE);
      // Different item IDs → different fingerprint
      expect(r1.sessionId).not.toBe(r2.sessionId);
    });
  });
});
