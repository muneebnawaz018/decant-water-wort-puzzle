import js from '@eslint/js';
import jest from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import noInlineStylesheet from './script/eslint-rules/no-inline-stylesheet.cjs';
import noRawColor from './script/eslint-rules/no-raw-color.cjs';

/**
 * Flat config. Three layers: the shared JS/TS baseline, then React and hooks,
 * then the two rules that hold this project's own invariants — the palette
 * module and the component/style split. Those two are errors, not warnings:
 * both encode a bug that already shipped once.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'dist/**',
      'coverage/**',
      '.expo/**',
      'docs/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
    },
    plugins: {
      local: {
        rules: {
          'no-raw-color': noRawColor,
          'no-inline-stylesheet': noInlineStylesheet,
        },
      },
    },
    rules: {
      // The codebase leans on `!` for indexed lookups it has already bounded.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The New JSX transform: no `React` import needed, and no prop-types in
      // a TypeScript codebase.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // A dependency this hook actually needs and does not list is the source
      // of the stalest class of bug here — a memoised board that never
      // refreshes. Never a warning.
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // The palette module is the one place a color literal is allowed to exist.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/colors.ts', 'src/**/__tests__/**'],
    rules: { 'local/no-raw-color': 'error' },
  },

  // Styles live beside their component, not inside it.
  {
    files: ['src/**/*.tsx'],
    rules: { 'local/no-inline-stylesheet': 'error' },
  },

  // The CLI scripts ARE their own output — console is the interface.
  {
    files: ['script/**/*.{mjs,cjs,js}'],
    rules: { 'no-console': 'off' },
  },

  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'jest.setup.js'],
    ...jest.configs['flat/recommended'],
    languageOptions: { globals: { ...globals.jest } },
  }
);
