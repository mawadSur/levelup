import type { Config } from 'tailwindcss';

export const levelupPreset = {
  darkMode: 'class' as const,
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          warm: 'hsl(var(--accent-warm))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': [
          'clamp(3.5rem, 6vw, 5rem)',
          { lineHeight: '1.05', letterSpacing: '-0.02em' },
        ] as [string, { lineHeight: string; letterSpacing: string }],
        'display-lg': [
          'clamp(2.5rem, 4.5vw, 3.75rem)',
          { lineHeight: '1.1', letterSpacing: '-0.018em' },
        ] as [string, { lineHeight: string; letterSpacing: string }],
        'display-md': [
          'clamp(2rem, 3.5vw, 2.75rem)',
          { lineHeight: '1.15', letterSpacing: '-0.015em' },
        ] as [string, { lineHeight: string; letterSpacing: string }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }] as [
          string,
          { lineHeight: string; letterSpacing: string },
        ],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'ink-blot': {
          '0%': { transform: 'translateX(-100%)', opacity: '0.4' },
          '50%': { opacity: '0.9' },
          '100%': { transform: 'translateX(100%)', opacity: '0.4' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ink-blot': 'ink-blot 2.4s ease-in-out infinite',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

const config: Config = {
  content: [],
  presets: [levelupPreset],
};

export default config;
