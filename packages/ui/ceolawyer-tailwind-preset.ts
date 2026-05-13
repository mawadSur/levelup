import type { Config } from 'tailwindcss';

/*
 * CEO Lawyer client preset — cl-* namespaced theme extension.
 * Mirrors the kapitus preset shape so consumers get cl-* utilities
 * (cl-navy, cl-paper, cl-gold, etc.) that resolve against CSS custom
 * properties defined in packages/ui/src/styles/ceolawyer.css.
 *
 * Tokens are class-scoped to `.ceolawyer`, so utilities only resolve
 * correctly inside the scoped layout.
 */
export const ceolawyerPreset = {
  theme: {
    extend: {
      colors: {
        'cl-paper': 'rgb(var(--cl-paper) / <alpha-value>)',
        'cl-surface': 'rgb(var(--cl-surface) / <alpha-value>)',
        'cl-mist': 'rgb(var(--cl-mist) / <alpha-value>)',
        'cl-fog': 'rgb(var(--cl-fog) / <alpha-value>)',
        'cl-rule': 'rgb(var(--cl-rule) / <alpha-value>)',
        'cl-rule-strong': 'rgb(var(--cl-rule-strong) / <alpha-value>)',
        'cl-ink': 'rgb(var(--cl-ink) / <alpha-value>)',
        'cl-ink-soft': 'rgb(var(--cl-ink-soft) / <alpha-value>)',
        'cl-ink-mute': 'rgb(var(--cl-ink-mute) / <alpha-value>)',
        'cl-ink-faint': 'rgb(var(--cl-ink-faint) / <alpha-value>)',
        'cl-navy': 'rgb(var(--cl-navy) / <alpha-value>)',
        'cl-navy-deep': 'rgb(var(--cl-navy-deep) / <alpha-value>)',
        'cl-navy-soft': 'rgb(var(--cl-navy-soft) / <alpha-value>)',
        'cl-gold': 'rgb(var(--cl-gold) / <alpha-value>)',
        'cl-gold-deep': 'rgb(var(--cl-gold-deep) / <alpha-value>)',
        'cl-dark-band': 'rgb(var(--cl-dark-band) / <alpha-value>)',
        'cl-cream': 'rgb(var(--cl-cream) / <alpha-value>)',
        'cl-success': 'rgb(var(--cl-success) / <alpha-value>)',
        'cl-warning': 'rgb(var(--cl-warning) / <alpha-value>)',
        'cl-danger': 'rgb(var(--cl-danger) / <alpha-value>)',
        'cl-info': 'rgb(var(--cl-info) / <alpha-value>)',
      },
      borderRadius: {
        'cl-sm': '4px',
        'cl-md': '8px',
        'cl-lg': '14px',
        'cl-pill': '9999px',
      },
      boxShadow: {
        'cl-sm': '0 1px 2px rgba(15, 42, 74, 0.05), 0 1px 3px rgba(15, 42, 74, 0.07)',
        'cl-md': '0 4px 6px -1px rgba(15, 42, 74, 0.07), 0 2px 4px -2px rgba(15, 42, 74, 0.07)',
      },
      maxWidth: {
        'cl-container': '1240px',
        'cl-reading': '680px',
      },
      transitionTimingFunction: {
        'cl-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

const config: Config = {
  content: [],
  presets: [ceolawyerPreset],
};

export default config;
