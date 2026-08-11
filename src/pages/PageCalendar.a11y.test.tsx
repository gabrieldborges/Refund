import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { axe } from "vitest-axe";
import { QueryWrapper } from "@/test/utils";
import { AuthProvider } from "@/context/AuthContext";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import PageCalendar from "./PageCalendar";

// The month grid is the component with the most keyboard and ARIA semantics in this
// application — a grid with 31 focusable cells and a roving tabindex. Auditing it is
// the point of this file, more than for the other screens.
//
// Scoped to WCAG A/AA with color-contrast disabled (jsdom loads no CSS), like the
// other *.a11y.test.tsx files.
describe("PageCalendar accessibility", () => {
  it("has no WCAG A/AA violations", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "token");
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ id: 1, name: "Ana", email: "ana@example.com", role: "standard" })
    );

    const router = createMemoryRouter(
      [
        {
          path: "/calendar",
          loader: () => ({ month: "2026-08", day: "2026-08-03" }),
          Component: PageCalendar,
        },
      ],
      { initialEntries: ["/calendar?month=2026-08&day=2026-08-03"] }
    );

    const { container } = render(
      <QueryWrapper>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryWrapper>
    );

    // Audited with a day selected, so the day panel is in the tree too — auditing
    // the grid alone would skip half the screen.
    expect(await screen.findByRole("button", { name: /Dia 3, 2 solicitações/ })).toBeInTheDocument();

    const results = await axe(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
