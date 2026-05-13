// Shared ESLint flat config for the LevelUp monorepo.
// Workspaces extend with: import base from '@levelup/config-eslint';
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', '**/generated/**'],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // NestJS DI relies on decorator metadata emitted via `emitDecoratorMetadata`.
    // TypeScript 5+ strictly strips `import type { … }` even with that flag, so
    // injected service classes MUST be value imports or the runtime sees
    // `[Function]` in design:paramtypes and DI fails at bootstrap. The
    // `consistent-type-imports` autofix would otherwise undo every value
    // import back to a type-only one. Scope the override narrowly to the
    // NestJS app.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
);
