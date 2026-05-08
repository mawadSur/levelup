'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeCopyButtonProps {
  code: string;
}

/**
 * Small inline "copy to clipboard" button rendered inside <pre> blocks.
 * Flips to a checkmark for 1500ms after a successful copy, then reverts.
 * Fixed minimum width so the icon swap never shifts the code block layout.
 */
export function CodeCopyButton({ code }: CodeCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      {/* Keyframes for the checkmark scale-bounce */}
      <style>{`
        @keyframes ccb-bounce {
          0%   { transform: scale(0.7); }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ccb-bounce { animation: none !important; }
        }
        .ccb-bounce {
          animation: ccb-bounce 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied!' : 'Copy code'}
        title={copied ? 'Copied!' : 'Copy code'}
        className={[
          // Fixed width so swapping icons doesn't shift layout
          'inline-flex min-w-[2rem] items-center justify-center gap-1',
          'rounded px-1.5 py-1',
          'text-xs font-medium',
          // Subtle oxblood-tinted ghost style
          'border border-transparent',
          'text-signal/60 hover:text-signal hover:border-signal/30 hover:bg-signal/5',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
          // Float to top-right inside the <pre>
          'absolute right-2 top-2 z-10',
        ].join(' ')}
      >
        {copied ? (
          <Check size={14} aria-hidden="true" className="ccb-bounce text-emerald-600" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
