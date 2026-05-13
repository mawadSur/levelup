/**
 * scoring.ts — pure, side-effect-free scoring algorithm for LevelUp assessments.
 *
 * Scoring algorithm (from assessment-bank README):
 *  1. Sample 30 items proportionally: 7 BEGINNER, 9 PRACTITIONER, 8 POWER_USER, 6 CHAMPION.
 *  2. Score each level: score[L] = correct@L / presented@L.
 *  3. Walk CHAMPION → BEGINNER and pick the highest level where score[L] >= 0.60.
 *  4. If no level reaches 0.60, recommend BEGINNER.
 */

import { AssessmentItem } from '@levelup/db';
import { AiLevel } from '@levelup/db';

export interface LevelScore {
  correct: number;
  total: number;
  ratio: number;
}

export interface ScoreResult {
  correct: number;
  total: number;
  scoreByLevel: Record<AiLevel, LevelScore>;
  recommendedLevel: AiLevel;
}

/** The threshold a user must reach at a given level to be recommended at that level. */
export const PASS_THRESHOLD = 0.6;

/** The walk order when determining the recommended level (highest → lowest). */
export const LEVEL_WALK_ORDER: AiLevel[] = [
  AiLevel.CHAMPION,
  AiLevel.POWER_USER,
  AiLevel.PRACTITIONER,
  AiLevel.BEGINNER,
];

/**
 * Pure scoring function — no DB access, no IO.
 *
 * @param items      - The full set of `AssessmentItem` rows that were sampled for this session.
 * @param responses  - A Map from itemId → choiceIndex as submitted by the user.
 * @returns          - Breakdown by level plus the final recommended AiLevel.
 */
export function scoreAssessment(
  items: AssessmentItem[],
  responses: Map<string, number>,
): ScoreResult {
  // Initialise per-level counters.
  const counters: Record<AiLevel, { correct: number; total: number }> = {
    [AiLevel.BEGINNER]: { correct: 0, total: 0 },
    [AiLevel.PRACTITIONER]: { correct: 0, total: 0 },
    [AiLevel.POWER_USER]: { correct: 0, total: 0 },
    [AiLevel.CHAMPION]: { correct: 0, total: 0 },
  };

  let totalCorrect = 0;

  for (const item of items) {
    const choiceIndex = responses.get(item.id);
    if (choiceIndex === undefined) continue; // item was not answered — count as wrong

    counters[item.level].total += 1;
    if (choiceIndex === item.correctIndex) {
      counters[item.level].correct += 1;
      totalCorrect += 1;
    }
  }

  // Build the scoreByLevel record with ratios.
  const scoreByLevel: Record<AiLevel, LevelScore> = {
    [AiLevel.BEGINNER]: buildLevelScore(counters[AiLevel.BEGINNER]),
    [AiLevel.PRACTITIONER]: buildLevelScore(counters[AiLevel.PRACTITIONER]),
    [AiLevel.POWER_USER]: buildLevelScore(counters[AiLevel.POWER_USER]),
    [AiLevel.CHAMPION]: buildLevelScore(counters[AiLevel.CHAMPION]),
  };

  // Walk CHAMPION → BEGINNER; first level at or above threshold wins.
  let recommendedLevel: AiLevel = AiLevel.BEGINNER;
  for (const level of LEVEL_WALK_ORDER) {
    const ls = scoreByLevel[level];
    if (ls.total > 0 && ls.ratio >= PASS_THRESHOLD) {
      recommendedLevel = level;
      break;
    }
  }

  return {
    correct: totalCorrect,
    total: items.length,
    scoreByLevel,
    recommendedLevel,
  };
}

function buildLevelScore(counter: { correct: number; total: number }): LevelScore {
  return {
    correct: counter.correct,
    total: counter.total,
    ratio: counter.total === 0 ? 0 : counter.correct / counter.total,
  };
}
