import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  optimizeDeps: {
    include: ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
  },
  test: {
    // jsdom gives React components a fake DOM so they can render in Node.
    environment: 'jsdom',
    // Runs before each test file: registers jest-dom matchers globally.
    setupFiles: './src/test/setup.ts',
  },
})
