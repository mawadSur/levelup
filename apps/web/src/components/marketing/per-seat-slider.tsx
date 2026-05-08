'use client';

import * as React from 'react';
import { MonoLabel, cn } from '@levelup/ui';

interface PerSeatSliderProps {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Label shown above the slider — defaults to "SEATS · {value}". */
  label?: string;
  /** Optional hint shown under the track (e.g. "MIN 25 · MAX 100"). */
  hint?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function PerSeatSlider({
  value,
  onChange,
  min,
  max,
  step = 5,
  label,
  hint,
  id,
  disabled,
  className,
}: PerSeatSliderProps) {
  const reactId = React.useId();
  const inputId = id ?? `seat-slider-${reactId}`;
  const fillPct = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between">
        <MonoLabel tone="signal">{label ?? `SEATS · ${value}`}</MonoLabel>
        {hint ? <MonoLabel className="text-paper-500">{hint}</MonoLabel> : null}
      </div>

      <div className="relative">
        {/* Background track — thin ink-700 line */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-ink-700 rounded-data"
        />
        {/* Filled portion in signal */}
        <div
          aria-hidden
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-signal rounded-data transition-[width] duration-150 ease-mission"
          style={{ width: `${fillPct}%` }}
        />
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label ?? `Seats — ${value}`}
          className={cn(
            'relative z-10 w-full appearance-none bg-transparent',
            'focus:outline-none',
            // Webkit thumb
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:bg-signal',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-900',
            '[&::-webkit-slider-thumb]:rounded-data',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            'focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-signal',
            // Mozilla thumb
            '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:bg-signal',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink-900',
            '[&::-moz-range-thumb]:rounded-data',
            '[&::-moz-range-thumb]:cursor-pointer',
            // Webkit/Mozilla track — transparent so our absolute layers show
            '[&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-moz-range-track]:bg-transparent',
            'h-5',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.05em] text-paper-500">
        <span>MIN {min}</span>
        <span>MAX {max}</span>
      </div>
    </div>
  );
}
