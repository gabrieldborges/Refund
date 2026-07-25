import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { AuthProvider } from "../context/AuthContext";
import PageRegister from "./PageRegister";

// Accessibility audit with axe-core. Scoped to WCAG A/AA tags and run on the
// rendered subtree (not document) so jsdom's missing <title>/lang and the
// CSS-less color-contrast checks don't add noise — the focus is on labels,
// aria and accessible names, which are what this item improves.
describe("PageRegister accessibility", () => {
  it("has no WCAG A/AA violations", async () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <PageRegister />
        </MemoryRouter>
      </AuthProvider>
    );

    const results = await axe(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      // Contrast needs real rendered colors; jsdom loads no CSS, so it can't be
      // checked here (it belongs to a browser-based audit / future E2E).
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
