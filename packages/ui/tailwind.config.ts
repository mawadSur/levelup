import type { Config } from 'tailwindcss';

export const levelupPreset = {
  darkMode: 'class' as const,
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        paper: {
          100: 'rgb(var(--paper-100) / <alpha-value>)',
          300: 'rgb(var(--paper-300) / <alpha-value>)',
          500: 'rgb(var(--paper-500) / <alpha-value>)',
        },
        signal: {
          DEFAULT: 'rgb(var(--signal) / <alpha-value>)',
          dim: 'rgb(var(--signal-dim) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': [
          'clamp(4rem, 8vw, 7rem)',
          { lineHeight: '1.0', letterSpacing: '-0.02em' },
        ] as [string, { lineHeight: string; letterSpacing: string }],
        'display-lg': [
          'clamp(3rem, 6vw, 4.5rem)',
          { lineHeight: '1.05', letterSpacing: '-0.018em' },
        ] as [string, { lineHeight: string; letterSpacing: string }],
        'display-md': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        h1: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        h2: ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.005em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        h3: ['1.125rem', { lineHeight: '1.4', letterSpacing: '0.01em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        body: ['1rem', { lineHeight: '1.6', letterSpacing: '0' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        'body-lg': ['1.0625rem', { lineHeight: '1.7', letterSpacing: '0' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        mono: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.05em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
        'mono-sm': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.05em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        data: '0px',
      },
      transitionTimingFunction: {
        mission: 'cubic-bezier(0.2, 0.6, 0, 1)',
      },
      maxWidth: {
        content: '1200px',
        reading: '760px',
      },
      keyframes: {
        'mission-in': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'loading-bar': {
          '0%': { left: '-30%' },
          '100%': { left: '100%' },
        },
      },
      animation: {
        'mission-in': 'mission-in 240ms cubic-bezier(0.2, 0.6, 0, 1) both',
        'loading-bar': 'loading-bar 1.4s ease-out infinite',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

const config: Config = {
  content: [],
  presets: [levelupPreset],
};

export default config;
