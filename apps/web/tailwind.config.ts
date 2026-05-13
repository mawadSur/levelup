import type { Config } from 'tailwindcss';
import { levelupPreset } from '@levelup/ui/tailwind.config';
import { kapitusPreset } from '@levelup/ui/kapitus-tailwind-preset';
import { ceolawyerPreset } from '@levelup/ui/ceolawyer-tailwind-preset';

export default {
  content: ['./src/**/*.{ts,tsx}', './node_modules/@levelup/ui/src/**/*.{ts,tsx}'],
  presets: [levelupPreset, kapitusPreset, ceolawyerPreset],
} satisfies Config;
