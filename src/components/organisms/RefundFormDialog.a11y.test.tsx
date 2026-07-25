import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { QueryWrapper } from "../../test/utils";
import RefundFormDialog from "./RefundFormDialog";

// Accessibility audit of the create-refund form (react-hook-form + Zod) while
// open. Run on the dialog element (Radix portals it) and scoped to WCAG A/AA,
// with color-contrast disabled (jsdom has no CSS).
describe("RefundFormDialog accessibility", () => {
  it("has no WCAG A/AA violations when open", async () => {
    render(
      <QueryWrapper>
        <MemoryRouter>
          <RefundFormDialog open onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryWrapper>
    );

    const dialog = await screen.findByRole("dialog");
    const results = await axe(dialog, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
