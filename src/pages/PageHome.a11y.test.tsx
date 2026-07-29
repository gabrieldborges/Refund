import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { axe } from "vitest-axe";
import { QueryWrapper } from "@/test/utils";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
import PageHome from "./PageHome";

// Accessibility audit of the Home screen (summary band, search field, list and
// pagination) once the list request has resolved. Scoped to WCAG A/AA, with
// color-contrast disabled (jsdom loads no CSS) — same shape as the other
// *.a11y.test.tsx files in this branch.
describe("PageHome accessibility", () => {
  it("has no WCAG A/AA violations", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          loader: () => ({ page: 1, perPage: REFUNDS_PER_PAGE, name: undefined }),
          Component: PageHome,
        },
      ],
      { initialEntries: ["/"] }
    );

    const { container } = render(
      <QueryWrapper>
        <RouterProvider router={router} />
      </QueryWrapper>
    );

    // Wait for the mocked list request to resolve before auditing, so the
    // skeleton placeholders are not what gets checked.
    await screen.findByRole("textbox", { name: "Pesquisar pelo nome" });
    await screen.findByText("Almoço com cliente");

    const results = await axe(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
