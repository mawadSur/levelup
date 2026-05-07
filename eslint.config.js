// Root ESLint v9 flat config for the LevelUp monorepo.
// Each workspace's `eslint` invocation walks up to find this file. The base
// rules come from @levelup/config-eslint; web-app paths layer in the Next.js
// plugin so core-web-vitals checks still run after dropping `next lint`.
const base = require('@levelup/config-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const nextPlugin = require('@next/eslint-plugin-next');

module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/generated/**',
      '**/coverage/**',
      '**/*.config.{js,cjs,mjs,ts}',
      'packages/db/prisma/migrations/**',
      'apps/web/next-env.d.ts',
    ],
  },
  ...base,
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        global: 'readonly',
      },
    },
  },
];
