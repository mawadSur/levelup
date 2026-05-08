'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from '@levelup/ui';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { coach } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

type RecordState = 'idle' | 'recording' | 'transcribing';

/** Minimum hold duration before we treat it as an intentional recording. */
const MIN_RECORD_MS = 500;

/** MIME type for MediaRecorder — prefer opus/webm for wide browser support. */
const PREFERRED_MIME = 'audio/webm;codecs=opus';
const FALLBACK_MIME = 'audio/webm';

function getSupportedMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported(FALLBACK_MIME)) return FALLBACK_MIME;
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
  // Let the browser pick its own default
  return '';
}

function mimeToExt(mime: string): string {
  if (mime.includes('webm')) return 'recording.webm';
  if (mime.includes('ogg')) return 'recording.ogg';
  if (mime.includes('mp4')) return 'recording.mp4';
  return 'recording.webm';
}

// ---------------------------------------------------------------------------
// Waveform canvas sub-component
// ---------------------------------------------------------------------------

interface WaveformProps {
  analyser: AnalyserNode | null;
}

function Waveform({ analyser }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!analyser || prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 5;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser!.getByteFrequencyData(dataArray);

      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width - (BAR_COUNT - 1) * 2) / BAR_COUNT;
      const step = Math.floor(dataArray.length / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = dataArray[i * step] ?? 0;
        const barHeight = Math.max(4, (value / 255) * canvas.height);
        const x = i * (barWidth + 2);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = '#8B1A1A'; // oxblood
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, prefersReduced]);

  if (prefersReduced) {
    return <span className="text-[10px] font-medium text-[#8B1A1A]">Recording…</span>;
  }

  return <canvas ref={canvasRef} width={48} height={20} aria-hidden="true" className="rounded" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  speakResponses: boolean;
  onToggleSpeak: () => void;
}

export function VoiceControls({ onTranscript, speakResponses, onToggleSpeak }: VoiceControlsProps) {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [mediaRecorderSupported, setMediaRecorderSupported] = useState(true);

  const prefersReduced = useReducedMotion();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const spaceKeyActiveRef = useRef(false);

  // Check MediaRecorder availability on mount
  useEffect(() => {
    setMediaRecorderSupported(typeof MediaRecorder !== 'undefined');
  }, []);

  // ---------------------------------------------------------------------------
  // Core record logic
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (recordState !== 'idle') return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        'Microphone access denied. Allow microphone access in your browser settings to use voice input.',
      );
      return;
    }

    streamRef.current = stream;

    // Build analyser for waveform visualisation
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    setAnalyserNode(analyser);

    const mime = getSupportedMime();
    const recorderOpts = mime ? { mimeType: mime } : {};
    const recorder = new MediaRecorder(stream, recorderOpts);
    recorderRef.current = recorder;
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();
    setRecordState('recording');
  }, [recordState]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed < MIN_RECORD_MS) {
      // Too short — ignore and clean up
      recorder.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
      setAnalyserNode(null);
      setRecordState('idle');
      return;
    }

    setRecordState('transcribing');

    // Collect remaining data then transcribe
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => undefined);
    setAnalyserNode(null);

    const mimeUsed = recorder.mimeType || FALLBACK_MIME;
    const blob = new Blob(chunksRef.current, { type: mimeUsed });
    chunksRef.current = [];

    try {
      const { text } = await coach.transcribe(blob, mimeToExt(mimeUsed));
      if (text.trim().length > 0) {
        onTranscript(text.trim());
      }
    } catch {
      toast.error('Transcription failed. Please try again.');
    } finally {
      setRecordState('idle');
    }
  }, [onTranscript]);

  // ---------------------------------------------------------------------------
  // Pointer events (mouse + touch)
  // ---------------------------------------------------------------------------

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      void startRecording();
    },
    [startRecording],
  );

  const handlePointerUp = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  // ---------------------------------------------------------------------------
  // Keyboard: Spacebar hold-to-talk while focused
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.code === 'Space' && !spaceKeyActiveRef.current) {
        e.preventDefault();
        spaceKeyActiveRef.current = true;
        void startRecording();
      }
    },
    [startRecording],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spaceKeyActiveRef.current = false;
        void stopRecording();
      }
    },
    [stopRecording],
  );

  // ---------------------------------------------------------------------------
  // Clean up on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  if (!mediaRecorderSupported) {
    // Hide entirely if browser doesn't support recording
    return null;
  }

  const isRecording = recordState === 'recording';
  const isTranscribing = recordState === 'transcribing';

  return (
    <div className="flex items-center gap-1.5">
      {/* Live waveform — visible while recording */}
      {isRecording && (
        <div className="flex items-center" aria-hidden="true">
          <Waveform analyser={analyserNode} />
        </div>
      )}

      {/* Speaker toggle */}
      <button
        type="button"
        onClick={onToggleSpeak}
        title={speakResponses ? 'Disable spoken responses' : 'Enable spoken responses'}
        aria-label={speakResponses ? 'Disable spoken responses' : 'Enable spoken responses'}
        aria-pressed={speakResponses}
        className={[
          'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
          speakResponses
            ? 'border-[#8B1A1A] bg-[#8B1A1A]/10 text-[#8B1A1A] hover:bg-[#8B1A1A]/20'
            : 'border-ink-600 text-paper-300 hover:bg-ink-700',
        ].join(' ')}
      >
        {speakResponses ? (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* Mic button */}
      <button
        type="button"
        aria-label="Hold to record voice input"
        aria-pressed={isRecording}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        disabled={isTranscribing}
        className={[
          'relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors select-none',
          isRecording
            ? 'border-[#8B1A1A] bg-[#8B1A1A] text-white'
            : isTranscribing
              ? 'cursor-wait border-ink-600 bg-ink-700 text-paper-300'
              : 'border-ink-600 text-paper-300 hover:bg-ink-700',
          // Pulsing ring while recording (suppressed under reduced motion)
          isRecording && !prefersReduced
            ? 'after:absolute after:inset-0 after:animate-ping after:rounded-full after:border after:border-[#8B1A1A]/60'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {/* Screen-reader live region */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isRecording ? 'Recording started' : isTranscribing ? 'Transcribing audio' : ''}
      </span>
    </div>
  );
}
