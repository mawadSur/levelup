import { toFile } from 'openai';
import { getOpenAI } from './client';
import { isStubMode } from './config';
import { withRetry } from './retry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Whisper hard limit per request (bytes). */
const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/** TTS hard limit per request (characters). */
const TTS_MAX_CHARS = 4000;

/**
 * Tiny 1-second silent MP3 frame, base64-encoded. Valid MP3 header so an
 * <audio> element can actually play it without errors.
 *
 * Generated from a standard 44100 Hz mono MP3 silence frame sequence.
 */
const SILENT_MP3_BASE64 =
  'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYBAAAAAAAAAnHFBxS4AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEYABEY41QxCgU94AI1BXjQIRMBjAbgiQCIgImIAAABEwAAABMxjAYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbjAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDAbgYDA==';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscribeOptions {
  /** Raw audio bytes. */
  audio: Buffer;
  /** e.g. 'recording.webm' — Whisper uses the extension as a format hint. */
  filename: string;
  /** ISO 639-1 language code, e.g. 'en'. */
  language?: string;
}

export interface TranscribeResult {
  text: string;
  durationMs: number;
  modelUsed: string;
}

export interface SynthesizeOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
}

export interface SynthesizeResult {
  audio: Buffer;
  contentType: string;
  modelUsed: string;
}

// ---------------------------------------------------------------------------
// Transcribe
// ---------------------------------------------------------------------------

/**
 * Transcribes audio using OpenAI Whisper (gpt-4o-mini-transcribe). Stub mode
 * returns a canned phrase so the UX flow is testable without a real key.
 */
export async function transcribeAudio(opts: TranscribeOptions): Promise<TranscribeResult> {
  if (opts.audio.byteLength > WHISPER_MAX_BYTES) {
    throw new Error(
      `[@levelup/llm] transcribeAudio: audio exceeds the 25 MB Whisper limit ` +
        `(received ${(opts.audio.byteLength / 1024 / 1024).toFixed(1)} MB).`,
    );
  }

  if (isStubMode()) {
    return {
      text: '[STUB] Hello, this is a test transcription.',
      durationMs: 800,
      modelUsed: 'stub',
    };
  }

  const client = getOpenAI();
  const startedAt = Date.now();

  const result = await withRetry(
    async () => {
      const file = await toFile(opts.audio, opts.filename, {
        type: mimeTypeFromFilename(opts.filename),
      });

      return client.audio.transcriptions.create({
        file,
        model: 'gpt-4o-mini-transcribe',
        ...(opts.language ? { language: opts.language } : {}),
      });
    },
    { maxAttempts: 2 },
  );

  return {
    text: result.text,
    durationMs: Date.now() - startedAt,
    modelUsed: 'gpt-4o-mini-transcribe',
  };
}

// ---------------------------------------------------------------------------
// Synthesize
// ---------------------------------------------------------------------------

/**
 * Synthesizes speech using OpenAI TTS (tts-1). Stub mode returns a tiny
 * silent MP3 buffer so the audio element can still play.
 */
export async function synthesizeSpeech(opts: SynthesizeOptions): Promise<SynthesizeResult> {
  const text = opts.text.slice(0, TTS_MAX_CHARS);
  const voice = opts.voice ?? 'alloy';
  const format = opts.format ?? 'mp3';

  if (isStubMode()) {
    const silentBuffer = Buffer.from(SILENT_MP3_BASE64, 'base64');
    return {
      audio: silentBuffer,
      contentType: 'audio/mpeg',
      modelUsed: 'stub',
    };
  }

  const client = getOpenAI();

  const audioBuffer = await withRetry(
    async () => {
      const response = await client.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
        response_format: format,
      });
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
    { maxAttempts: 2 },
  );

  const contentTypeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    opus: 'audio/ogg; codecs=opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
  };

  return {
    audio: audioBuffer,
    contentType: contentTypeMap[format] ?? 'audio/mpeg',
    modelUsed: 'tts-1',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    webm: 'audio/webm',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return map[ext] ?? 'audio/webm';
}
