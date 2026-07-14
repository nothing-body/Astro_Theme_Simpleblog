import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import * as astroParser from 'astro-eslint-parser';
import astroPlugin from 'eslint-plugin-astro';
import securityPlugin from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  {
    ignores: [
      '.astro/**',
      '.wrangler/**',
      'backup/**',
      'dist/**',
      'lighthouse_tmp/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'tmp/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      security: securityPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['src/scripts/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.astro'],
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      astro: astroPlugin,
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        describe: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
  },
  prettierConfig,
];
