// /home/nneessen/projects/commissionTracker/eslint.config.js

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'build', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Disable react-refresh warning for shadcn/ui components (they export variants)
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Disable react-refresh warning for context files (they export context + hooks together)
  {
    files: ['src/contexts/**/*.tsx', 'src/**/context/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Disable react-refresh warning for page/route files (they export loaders + components)
  {
    files: ['src/router.tsx', 'src/routes/**/*.tsx', 'src/features/**/pages/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Disable react-refresh warning for feature components that export utilities alongside
  {
    files: [
      'src/features/**/components/**/*.tsx',
      'src/features/**/admin/**/*.tsx',
      'src/features/auth/**/*.tsx',
      'src/features/dashboard/**/*.tsx',
      'src/features/comps/**/*.tsx',
      'src/features/test/**/*.tsx',
      'src/components/shared/**/*.tsx',
      'src/components/permissions/**/*.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Disable no-explicit-any for test files (test mocks often need flexibility)
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);