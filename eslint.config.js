const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const react = require('eslint-plugin-react');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  { ignores: ['dist/', 'tests/__coverage__/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  // Enables eslint-plugin-prettier and eslint-config-prettier, so Prettier
  // problems are reported as ESLint errors.
  prettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Injected by webpack's DefinePlugin / declared in the Jest config.
        DEVELOPMENT: 'readonly',
        FAKE_SERVER: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Allows for the parsing of JSX
        },
      },
    },
    settings: {
      react: {
        version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
      },
    },
    // Fine tune rules
    rules: {
      // `no-var-requires` was merged into `no-require-imports` in
      // typescript-eslint v8; webpack resolves these asset `require()` calls.
      '@typescript-eslint/no-require-imports': 0,
    },
  },
];
