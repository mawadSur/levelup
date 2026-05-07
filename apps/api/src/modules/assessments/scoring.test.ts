/**
 * apps/api — scoreAssessment unit tests
 *
 * Pure function; no DB/IO required.
 *
 * Run: pnpm --filter @levelup/api test  (uses the jest config in package.json)
 */

import { scoreAssessment, PASS_THRESHOLD } from './scoring';
import type { AssessmentItem } from '@levelup/db';
import { AiLevel, AssessmentType } from '@levelup/db';

// ---- helpers ----------------------------------------------------------------

/** Build a minimal AssessmentItem stub. */
function item(id: string, level: AiLevel, correctIndex: number): AssessmentItem {
  return {
    id,
    level,
    correctIndex,
    // remaining fields are not used by scoreAssessment
    organizationId: null,
    type: AssessmentType.BASELINE,
    question: 'stub question',
    choices: ['a', 'b', 'c', 'd'],
    explanation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Build `count` items of the given level, each with correctIndex = 0. */
function itemsForLevel(level: AiLevel, count: number, idPrefix: string): AssessmentItem[] {
  return Array.from({ length: count }, (_, i) => item(`${idPrefix}_${i}`, level, 0));
}

/** Build a response Map where itemIds are answered correctly. */
function correctResponses(items: AssessmentItem[]): Map<string, number> {
  return new Map(items.map((it) => [it.id, it.correctIndex]));
}

/** Build a response Map where every item is answered with index 99 (wrong). */
function wrongResponses(items: AssessmentItem[]): Map<string, number> {
  return new Map(items.map((it) => [it.id, 99]));
}

/**
 * Partially correct responses: `ratio` proportion answered correctly
 * (rounds down). The rest are answered with index 99 (wrong).
 */
function partialResponses(items: AssessmentItem[], ratio: number): Map<string, number> {
  const correct = Math.floor(items.length * ratio);
  const map = new Map<string, number>();
  items.forEach((it, i) => {
    map.set(it.id, i < correct ? it.correctIndex : 99);
  });
  return map;
}

// ============================================================================
// Tests
// ============================================================================

describe('scoreAssessment', () => {
  // --------------------------------------------------------------------------
  // CHAMPION scenario: all levels ≥ 0.60 and CHAMPION is highest
  // --------------------------------------------------------------------------
  describe('all CHAMPION items correct + ≥60% every level → CHAMPION', () => {
    it('recommends CHAMPION', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const pItems = itemsForLevel(AiLevel.PRACTITIONER, 9, 'p');
      const puItems = itemsForLevel(AiLevel.POWER_USER, 8, 'pu');
      const cItems = itemsForLevel(AiLevel.CHAMPION, 6, 'c');
      const allItems = [...bItems, ...pItems, ...puItems, ...cItems];

      // All correct at every level
      const responses = correctResponses(allItems);
      const result = scoreAssessment(allItems, responses);

      expect(result.recommendedLevel).toBe(AiLevel.CHAMPION);
      expect(result.scoreByLevel[AiLevel.CHAMPION].ratio).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    });
  });

  // --------------------------------------------------------------------------
  // BEGINNER scenario: 50% at all levels
  // --------------------------------------------------------------------------
  describe('50% at all levels → BEGINNER', () => {
    it('recommends BEGINNER', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const pItems = itemsForLevel(AiLevel.PRACTITIONER, 9, 'p');
      const puItems = itemsForLevel(AiLevel.POWER_USER, 8, 'pu');
      const cItems = itemsForLevel(AiLevel.CHAMPION, 6, 'c');
      const allItems = [...bItems, ...pItems, ...puItems, ...cItems];

      // Apply per-level so each level lands at ~50%, well below the 0.60 threshold.
      const responses = new Map<string, number>([
        ...partialResponses(bItems, 0.5),
        ...partialResponses(pItems, 0.5),
        ...partialResponses(puItems, 0.5),
        ...partialResponses(cItems, 0.5),
      ]);
      const result = scoreAssessment(allItems, responses);

      expect(result.recommendedLevel).toBe(AiLevel.BEGINNER);
      // All levels below threshold
      for (const level of Object.values(AiLevel)) {
        expect(result.scoreByLevel[level].ratio).toBeLessThan(PASS_THRESHOLD);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Empty responses → BEGINNER, 0 correct
  // --------------------------------------------------------------------------
  describe('empty responses', () => {
    it('recommends BEGINNER and records 0 correct', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const pItems = itemsForLevel(AiLevel.PRACTITIONER, 9, 'p');
      const puItems = itemsForLevel(AiLevel.POWER_USER, 8, 'pu');
      const cItems = itemsForLevel(AiLevel.CHAMPION, 6, 'c');
      const allItems = [...bItems, ...pItems, ...puItems, ...cItems];

      const result = scoreAssessment(allItems, new Map());

      expect(result.correct).toBe(0);
      expect(result.total).toBe(allItems.length);
      expect(result.recommendedLevel).toBe(AiLevel.BEGINNER);
    });
  });

  // --------------------------------------------------------------------------
  // Mixed: 65% beginner, 65% practitioner, 30% power_user → PRACTITIONER
  // --------------------------------------------------------------------------
  describe('strong PRACTITIONER + weak POWER_USER → PRACTITIONER', () => {
    it('recommends PRACTITIONER', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const pItems = itemsForLevel(AiLevel.PRACTITIONER, 9, 'p');
      const puItems = itemsForLevel(AiLevel.POWER_USER, 8, 'pu');
      const cItems = itemsForLevel(AiLevel.CHAMPION, 6, 'c');

      // Math.floor rounding means 0.65 of 9 = 5 (~0.555, fails 0.60). Use 0.7
      // to land PRACTITIONER at 6/9 ≈ 0.667 — comfortably above the threshold.
      const responses = new Map<string, number>([
        ...partialResponses(bItems, 0.7), // 4/7 = 0.571 < 0.60 — fails
        ...partialResponses(pItems, 0.7), // 6/9 = 0.667 ≥ 0.60 — passes
        ...partialResponses(puItems, 0.3), // 2/8 = 0.250 < 0.60 — fails
        ...wrongResponses(cItems), // 0/6 = 0.000        — fails
      ]);

      const result = scoreAssessment([...bItems, ...pItems, ...puItems, ...cItems], responses);

      // Walk order: CHAMPION → POWER_USER → PRACTITIONER → BEGINNER
      // CHAMPION: 0% → fail; POWER_USER: 25% → fail; PRACTITIONER: 67% → pass
      expect(result.recommendedLevel).toBe(AiLevel.PRACTITIONER);
    });
  });

  // --------------------------------------------------------------------------
  // scoreByLevel ratios
  // --------------------------------------------------------------------------
  describe('scoreByLevel', () => {
    it('computes ratio = correct / total for each level', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const pItems = itemsForLevel(AiLevel.PRACTITIONER, 9, 'p');
      const allItems = [...bItems, ...pItems];

      // 4 out of 7 beginner correct, 0 practitioner correct
      const correctB = bItems.slice(0, 4);
      const responses = new Map<string, number>([
        ...correctResponses(correctB),
        ...wrongResponses(bItems.slice(4)),
        ...wrongResponses(pItems),
      ]);

      const result = scoreAssessment(allItems, responses);
      expect(result.scoreByLevel[AiLevel.BEGINNER].correct).toBe(4);
      expect(result.scoreByLevel[AiLevel.BEGINNER].total).toBe(7);
      expect(result.scoreByLevel[AiLevel.BEGINNER].ratio).toBeCloseTo(4 / 7, 5);
      expect(result.scoreByLevel[AiLevel.PRACTITIONER].ratio).toBe(0);
    });

    it('ratio is 0 for a level with no items', () => {
      const bItems = itemsForLevel(AiLevel.BEGINNER, 7, 'b');
      const result = scoreAssessment(bItems, correctResponses(bItems));
      // No CHAMPION items presented
      expect(result.scoreByLevel[AiLevel.CHAMPION].total).toBe(0);
      expect(result.scoreByLevel[AiLevel.CHAMPION].ratio).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // total count
  // --------------------------------------------------------------------------
  describe('total count', () => {
    it('equals the number of items passed in', () => {
      const items = [
        ...itemsForLevel(AiLevel.BEGINNER, 7, 'b'),
        ...itemsForLevel(AiLevel.PRACTITIONER, 9, 'p'),
        ...itemsForLevel(AiLevel.POWER_USER, 8, 'pu'),
        ...itemsForLevel(AiLevel.CHAMPION, 6, 'c'),
      ];
      const result = scoreAssessment(items, correctResponses(items));
      expect(result.total).toBe(30);
    });
  });
});
