import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Architecture boundaries: turn the "import only the feature façade" convention
  // (Item 8) into an executable rule — an architecture fitness function that
  // fails the lint when an import crosses a layer it shouldn't.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Teaches the boundaries resolver how to follow the "@/..." alias, so it
      // can classify each imported file into the right layer.
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      // Classify each folder into an architecture layer. In boundaries v7 an
      // element is a FOLDER (patterns match folders, not files), so the four
      // loose files at src/ root (App/main/router/router-loaders) stay
      // "unknown" — they are top-layer app code and left unrestricted.
      'boundaries/elements': [
        // A whole feature is one element; "featureName" captures which one, so
        // we can tell same-feature imports apart from cross-feature ones.
        { type: 'feature', pattern: 'src/features/*', capture: ['featureName'] },
        { type: 'ui', pattern: ['src/components/atoms', 'src/components/molecules'] },
        { type: 'shared', pattern: ['src/lib', 'src/hooks'] },
        {
          type: 'app',
          pattern: [
            'src/pages',
            'src/components/core',
            'src/components/organisms',
            'src/context',
            'src/schemas',
          ],
        },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          // Anything not explicitly allowed below is forbidden.
          default: 'disallow',
          policies: [
            // shared = neutral utilities: may only lean on other shared code.
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            // ui = design system: may use shared, never features nor app.
            {
              from: { element: { type: 'ui' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'shared'] } } } },
            },
            // feature: may use the design system and shared utilities.
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'shared'] } } } },
            },
            // feature: may import its OWN internals only. "internal" means the
            // dependency stays inside the same feature; a cross-feature import
            // would be "sibling" and is left disallowed.
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: { element: { type: 'feature' } },
                dependency: { relationship: { from: 'internal' } },
              },
            },
            // app = composition layer: free to use app code, ui and shared.
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { types: { anyOf: ['app', 'ui', 'shared'] } } },
              },
            },
            // app may reach a feature ONLY through its façade (index.ts),
            // never through an internal path.
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { type: 'feature', fileInternalPath: 'index.{ts,tsx}' } },
              },
            },
          ],
        },
      ],
    },
  },
])
