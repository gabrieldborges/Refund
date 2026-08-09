import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Repaint hardcoded black fills as currentColor so a `text-*` color utility
    // (and the theme) drives icon color; otherwise icons stay black in dark mode.
    svgr({
      svgrOptions: {
        replaceAttrValues: {
          black: "currentColor",
          "#000": "currentColor",
          "#000000": "currentColor",
        },
      },
    }),
  ],
  resolve: {
    // "@" points at src/, so imports read as "@/lib/api" instead of "../../../lib/api".
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: {
    include: ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
  },
  test: {
    // jsdom gives React components a fake DOM so they can render in Node.
    environment: 'jsdom',
    // Runs before each test file: registers jest-dom matchers globally.
    setupFiles: './src/test/setup.ts',
    // Coverage answers one question — "which lines never ran?" — and never
    // "is this correct". Nothing fails on the number: the three most recent
    // defects in this project all lived on covered lines, so a threshold here
    // would buy a feeling of safety the project's own history contradicts.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        // Design-system components copied from the shadcn registry. Their
        // tests belong upstream, and at ~2000 lines they bury our own code in
        // the report — sidebar.tsx alone is bigger than most features here.
        'src/components/ui/**',
        'src/**/*.d.ts',
        'src/main.tsx',
      ],
    },
  },
})
