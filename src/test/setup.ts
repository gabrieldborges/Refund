// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) on
// Vitest's expect, and augments their TypeScript types.
import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// jsdom has no matchMedia; the theme store queries it. Default to light.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom implements neither the Pointer Capture API nor scrollIntoView. Radix
// Select (and other Radix primitives using pointer events) calls these during
// open/close and keyboard navigation, so without a stub every interaction
// throws in tests even though the real browser behaviour is unaffected.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom implements neither createObjectURL nor revokeObjectURL. The receipt
// preview turns a Blob into an object URL, so without these stubs every test
// touching it throws. The counter makes each URL unique, which is what lets a
// test assert that the exact URL it received was the one revoked.
if (!URL.createObjectURL) {
  let objectUrlCount = 0;
  URL.createObjectURL = () => `blob:mock/${++objectUrlCount}`;
  URL.revokeObjectURL = () => {};
}

// Start the MSW server before any test. `onUnhandledRequest: "error"` makes a
// forgotten handler fail loudly instead of hitting the real network.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// After each test: unmount rendered components, drop any per-test handler
// overrides (server.use), and clear localStorage. Cleanup is wired manually
// because we run with explicit imports (globals: false); localStorage is
// cleared because the real AuthProvider persists a token/session there and one
// test's session must not leak into the next.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

// Stop the server once the whole suite is done.
afterAll(() => {
  server.close();
});
