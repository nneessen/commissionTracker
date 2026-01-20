// /home/nneessen/projects/commissionTracker/eslint.config.js

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

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
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'infrastructure', pattern: 'src/services/**' },
        { type: 'hooks', pattern: 'src/hooks/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'ui', pattern: 'src/components/**' },
        { type: 'shared-domain', pattern: 'src/domain/shared/**' },
        { type: 'shared-app', pattern: 'src/application/shared/**' },
        { type: 'shared-infra', pattern: 'src/infrastructure/shared/**' },
        { type: 'shared-infra', pattern: 'src/services/shared/**' },
        { type: 'shared-ui', pattern: 'src/ui/shared/**' },
        { type: 'shared-ui', pattern: 'src/components/shared/**' },
      ],
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
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: [] },
            { from: 'application', allow: ['domain', 'shared-domain'] },
            {
              from: 'infrastructure',
              allow: ['domain', 'application', 'shared-domain', 'shared-app'],
            },
            {
              from: 'hooks',
              allow: ['application', 'domain', 'shared-domain', 'shared-app'],
            },
            {
              from: 'features',
              allow: [
                'hooks',
                'application',
                'domain',
                'shared-domain',
                'shared-app',
                'shared-ui',
              ],
            },
            {
              from: 'ui',
              allow: ['hooks', 'application', 'domain', 'shared-domain', 'shared-ui'],
            },
          ],
        },
      ],
      'boundaries/no-private': [
        'error',
        {
          allowUncles: false,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'src/domain/*/**',
                'src/application/*/**',
                'src/infrastructure/*/**',
                'src/services/*/**',
                'src/hooks/*/**',
                'src/features/*/**',
                '@/domain/*/**',
                '@/application/*/**',
                '@/infrastructure/*/**',
                '@/services/*/**',
                '@/hooks/*/**',
                '@/features/*/**',
              ],
              message:
                'Deep imports are forbidden. Import only from the feature/domain index.ts barrel.',
            },
          ],
        },
      ],
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
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'src/infrastructure',
              message:
                'UI/features must not import infrastructure directly. Use hooks or application services.',
            },
            {
              name: 'src/services',
              message:
                'UI/features must not import infrastructure directly. Use hooks or application services.',
            },
            {
              name: '@/services',
              message:
                'UI/features must not import infrastructure directly. Use hooks or application services.',
            },
            {
              name: 'supabase',
              message: 'Supabase client must not be imported in UI/features.',
            },
            {
              name: '@/services/base/supabase',
              message: 'Supabase client must not be imported in UI/features.',
            },
            {
              name: 'src/services/base/supabase',
              message: 'Supabase client must not be imported in UI/features.',
            },
          ],
          patterns: [
            {
              group: [
                'src/infrastructure/**',
                'src/services/**',
                '@/services/**',
                'supabase/**',
                '@/services/base/supabase',
                'src/services/base/supabase',
              ],
              message: 'UI/features must not import infrastructure or Supabase directly.',
            },
            {
              group: [
                'src/domain/*/**',
                'src/application/*/**',
                'src/infrastructure/*/**',
                'src/services/*/**',
                'src/hooks/*/**',
                'src/features/*/**',
                '@/domain/*/**',
                '@/application/*/**',
                '@/infrastructure/*/**',
                '@/services/*/**',
                '@/hooks/*/**',
                '@/features/*/**',
              ],
              message:
                'Deep imports are forbidden. Import only from the feature/domain index.ts barrel.',
            },
          ],
        },
      ],
    },
  },
);
