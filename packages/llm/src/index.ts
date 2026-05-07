export { runCoach, streamCoach } from './coach';
export { chatComplete, chatStream } from './chat';
export { embed } from './embed';
export { classifySensitive } from './sensitive';
export { isStubMode, llmConfig } from './config';
export { withRetry } from './retry';
export { estimateTokens, recordUsage } from './accounting';
export {
  generateLearningPath,
  generatedPathSchema,
  generatedLessonSchema,
  generatedQuizSchema,
  generatedQuizQuestionSchema,
  TARGET_LEVELS,
} from './path-generator';
export type {
  GeneratePathInput,
  GeneratedPath,
  GeneratedLesson,
  GeneratedQuiz,
  GeneratedQuizQuestion,
  GeneratedTargetLevel,
} from './path-generator';

export type {
  ChatRole,
  ChatMessage,
  ChatCompleteOptions,
  ChatCompleteResult,
  ChatStreamChunk,
  ChatUsage,
  ResponseFormat,
  JsonSchemaResponseFormat,
  AiLevel,
  CoachInput,
  CoachOutput,
  CoachPriorTurn,
  CoachStreamChunk,
  CoachSensitiveWarning,
  SensitiveCategory,
  SensitiveResult,
  RetryOptions,
  UsageRecord,
  LlmConfig,
} from './types';

export { COACH_PRIOR_TURNS_MAX_COUNT, COACH_PRIOR_TURNS_TOKEN_BUDGET } from './coach';

export { transcribeAudio, synthesizeSpeech } from './voice';
export type {
  TranscribeOptions,
  TranscribeResult,
  SynthesizeOptions,
  SynthesizeResult,
} from './voice';
