import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router";
import PageSuccess from "./PageSuccess";
import type { MainLayoutOutletContext } from "@/components/core/MainLayout";

// Mounts PageSuccess at "/success" under a parent route that supplies the
// outlet context the same way MainLayout does, plus a "/" marker route so a
// navigation home can be observed as a route change.
function renderSuccess(context: MainLayoutOutletContext = { openNewRefund: vi.fn() }) {
  const router = createMemoryRouter(
    [
      {
        Component: () => <Outlet context={context} />,
        children: [
          { path: "/success", Component: PageSuccess },
          { path: "/", element: <div>home page</div> },
        ],
      },
    ],
    { initialEntries: ["/success"] }
  );

  return { router, ...render(<RouterProvider router={router} />) };
}

describe("PageSuccess", () => {
  // Two buttons with two different jobs. The "new request" one must NOT
  // navigate — it reopens the dialog in place; the old single button went to
  // the Home, which is what this task fixes.
  it("reopens the dialog without navigating", async () => {
    const user = userEvent.setup();
    const openNewRefund = vi.fn();
    const { router } = renderSuccess({ openNewRefund });

    await user.click(screen.getByRole("button", { name: "Nova solicitação" }));

    expect(openNewRefund).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/success");
  });

  it("offers a separate way back to the Home", async () => {
    const user = userEvent.setup();
    const { router } = renderSuccess();

    await user.click(screen.getByRole("button", { name: "Voltar para a Home" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});
