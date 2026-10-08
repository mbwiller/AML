// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config (STYLE_GUIDE.md §8): typescript-eslint strict + stylistic,
 * eslint-plugin-astro recommended, react-hooks on TS/TSX. The astro jsx-a11y
 * preset needs eslint-plugin-jsx-a11y, which does not yet declare ESLint 10
 * support (tech-stack.md §9), so it is not enabled here.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'AML Course Material/**',
      'test-results/**',
      'playwright-report/**',
      'public/**',
      'src/env.d.ts',
      '*.config.*',
      '.claude/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...astro.configs['flat/recommended'],

  // React islands and library code
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },

  {
    files: ['**/*.{ts,tsx,js,mjs,astro}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Browser globals for app code
  {
    files: ['src/**/*.{ts,tsx,astro}'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Node globals for scripts, configs, and tests; scripts may print to stdout
  {
    files: ['scripts/**/*.{ts,mjs,js}', 'tests/**/*.ts', '*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['scripts/**/*.{ts,mjs,js}'],
    rules: { 'no-console': 'off' },
  },

  // Vitest globals (`globals: true` in vitest.config.ts)
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  },
);
