import type { Config } from 'tailwindcss';
import { levelupPreset } from '@levelup/ui/tailwind.config';

export default {
  content: ['./src/**/*.{ts,tsx}', './node_modules/@levelup/ui/src/**/*.{ts,tsx}'],
  presets: [levelupPreset],
} satisfies Config;
