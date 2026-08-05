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
        { type: 'ui', pattern: ['src/components/ui'] },
        { type: 'shared', pattern: ['src/lib', 'src/hooks', 'src/stores'] },
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
  // Registry components under src/components/ui co-locate their cva variant
  // export next to the component (Button + buttonVariants, badge, form,
  // sidebar), which is structurally exactly what react-refresh/only-export-
  // components forbids. That pattern has no runtime effect — it only affects
  // whether Vite can hot-swap the component in isolation — and it applies to
  // the whole registry surface regardless of which specific component was
  // added, so the rule is off for the whole directory.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // react-hooks/purity and react-hooks/set-state-in-effect are React Compiler
  // rules bundled with eslint-plugin-react-hooks 7 that catch real runtime
  // bugs, not a structural pattern — so, unlike the rule above, they are not
  // silenced tree-wide. Components under src/components/ui are copied from
  // the shadcn registry but are hand-edited when the project needs it (see
  // the Zustand-persistence comment in sidebar.tsx), so "vendored" doesn't
  // mean "never touched" or "exempt from correctness checks". These two
  // specific files carry violations that shipped with the registry code
  // itself (sidebar.tsx's Math.random() inside useMemo for a skeleton width;
  // use-mobile.ts's setState called synchronously inside a useEffect body).
  // They're silenced per-file, by name, so a new or edited component that
  // trips either rule still surfaces normally; this list is expected to
  // shrink if upstream fixes them.
  {
    files: ['src/components/ui/sidebar.tsx', 'src/hooks/use-mobile.ts'],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // react-hooks/refs forbids reading ref.current during render, and is right
  // almost everywhere. useEnteredItems answers "what changed since the last
  // render", which has no correct state-based equivalent here: holding the
  // seen ids in state needs setState inside an effect (trading this rule for
  // set-state-in-effect) and re-renders immediately after, stripping the
  // animation class while it is still playing. Writing still happens in an
  // effect — that part is what makes StrictMode's double render safe, and
  // useEnteredItems.test.tsx renders under StrictMode precisely to prove it.
  //
  // Silenced per-file, by name, following the block above: an inline directive
  // does not work because the rule follows the value through the local alias,
  // so it would have to be repeated at every use site.
  {
    files: ['src/hooks/useEnteredItems.ts'],
    rules: { 'react-hooks/refs': 'off' },
  },
])
