// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) on
// Vitest's expect, and augments their TypeScript types.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount rendered components and reset the jsdom document after each test.
// Testing Library only auto-registers this when Vitest runs with globals: true;
// since we use explicit imports (globals: false), we wire it up here so one
// test's DOM never leaks into the next. Loaded once per test file via
// `test.setupFiles` in vite.config.ts.
afterEach(() => {
  cleanup();
});
