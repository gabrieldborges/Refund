import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { axe } from "vitest-axe";
import { QueryWrapper } from "@/test/utils";
import { AuthProvider } from "@/context/AuthContext";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { USERS_PER_PAGE } from "@/features/team";
import PageTeam from "./PageTeam";

// Accessibility audit of the team directory (search field, table and
// pagination) once the list request has resolved. Scoped to WCAG A/AA with
// color-contrast disabled (jsdom loads no CSS) — same shape as the other
// *.a11y.test.tsx files.
//
// The loader is stubbed rather than the real teamLoader: this file audits the
// rendered page, and the real loader would also exercise the admin redirect,
// which router-loaders.team.test.ts already covers.
describe("PageTeam accessibility", () => {
  it("has no WCAG A/AA violations", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "token");
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ id: 9, name: "Chefe", email: "chefe@example.com", role: "admin" })
    );

    const router = createMemoryRouter(
      [
        {
          path: "/team",
          loader: () => ({ page: 1, perPage: USERS_PER_PAGE, name: undefined }),
          Component: PageTeam,
        },
      ],
      { initialEntries: ["/team"] }
    );

    const { container } = render(
      <QueryWrapper>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryWrapper>
    );

    // Audit after the rows arrive: auditing the skeleton would check a tree the
    // user barely sees.
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();

    const results = await axe(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
