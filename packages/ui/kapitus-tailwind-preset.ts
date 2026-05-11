import type { Config } from 'tailwindcss';

/*
 * Kapitus client preset — kp-* namespaced theme extension.
 * Apps that import this preset get the kp-* utilities (kp-purple, kp-paper, etc.).
 * Apps that don't import it keep the Mission Brief tokens unchanged.
 *
 * The kp.* utilities reference CSS custom properties defined in
 * packages/ui/src/styles/kapitus.css. Those tokens are class-scoped to
 * `.kapitus`, so utilities only resolve correctly inside the scoped layout.
 */
export const kapitusPreset = {
  theme: {
    extend: {
      colors: {
        'kp-paper': 'rgb(var(--kp-paper) / <alpha-value>)',
        'kp-mist': 'rgb(var(--kp-mist) / <alpha-value>)',
        'kp-fog': 'rgb(var(--kp-fog) / <alpha-value>)',
        'kp-rule': 'rgb(var(--kp-rule) / <alpha-value>)',
        'kp-rule-strong': 'rgb(var(--kp-rule-strong) / <alpha-value>)',
        'kp-ink': 'rgb(var(--kp-ink) / <alpha-value>)',
        'kp-ink-soft': 'rgb(var(--kp-ink-soft) / <alpha-value>)',
        'kp-ink-mute': 'rgb(var(--kp-ink-mute) / <alpha-value>)',
        'kp-ink-faint': 'rgb(var(--kp-ink-faint) / <alpha-value>)',
        'kp-purple': 'rgb(var(--kp-purple) / <alpha-value>)',
        'kp-purple-deep': 'rgb(var(--kp-purple-deep) / <alpha-value>)',
        'kp-blue-soft': 'rgb(var(--kp-blue-soft) / <alpha-value>)',
        'kp-dark-band': 'rgb(var(--kp-dark-band) / <alpha-value>)',
        'kp-cream': 'rgb(var(--kp-cream) / <alpha-value>)',
        'kp-success': 'rgb(var(--kp-success) / <alpha-value>)',
        'kp-warning': 'rgb(var(--kp-warning) / <alpha-value>)',
        'kp-danger': 'rgb(var(--kp-danger) / <alpha-value>)',
        'kp-info': 'rgb(var(--kp-info) / <alpha-value>)',
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'kp-display': [
          'clamp(2.75rem, 5vw, 4rem)',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' },
        ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }],
        'kp-h1': [
          '2.25rem',
          { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' },
        ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }],
        'kp-h2': [
          '1.75rem',
          { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' },
        ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }],
        'kp-h3': [
          '1.25rem',
          { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '600' },
        ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }],
        'kp-body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }] as [
          string,
          { lineHeight: string; fontWeight: string },
        ],
        'kp-body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }] as [
          string,
          { lineHeight: string; fontWeight: string },
        ],
        'kp-body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }] as [
          string,
          { lineHeight: string; fontWeight: string },
        ],
        'kp-eyebrow': [
          '0.75rem',
          { lineHeight: '1.2', letterSpacing: '0.1em', fontWeight: '600' },
        ] as [string, { lineHeight: string; letterSpacing: string; fontWeight: string }],
      },
      borderRadius: {
        'kp-sm': '6px',
        'kp-md': '10px',
        'kp-lg': '16px',
        'kp-pill': '9999px',
      },
      boxShadow: {
        'kp-sm': '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'kp-md': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
      },
      maxWidth: {
        'kp-container': '1240px',
        'kp-reading': '680px',
      },
      transitionTimingFunction: {
        'kp-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

const config: Config = {
  content: [],
  presets: [kapitusPreset],
};

export default config;
