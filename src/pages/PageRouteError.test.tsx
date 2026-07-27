import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import PageRouteError from "./PageRouteError";

// Mounts PageRouteError as the ErrorBoundary of a route whose loader throws,
// mirroring how router.tsx wires it as the root route's ErrorBoundary and how
// router-loaders.ts throws a Response on a bad request (see the 400 thrown by
// refundDetailLoader). This is the same mechanism react-router uses in the
// real app, not a contrived setup.
function renderWithThrownResponse(status: number) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        ErrorBoundary: PageRouteError,
        loader: () => {
          throw new Response(null, { status });
        },
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

describe("PageRouteError", () => {
  // A standalone error page (rendered outside the app shell) must still
  // expose exactly one `main` landmark, so the document isn't left without one.
  it("exposes exactly one main landmark", async () => {
    renderWithThrownResponse(404);

    expect(await screen.findAllByRole("main")).toHaveLength(1);
  });

  // A 404 route error must render the not-found message from getErrorMessage.
  it("shows the not-found message for a 404 route error", async () => {
    renderWithThrownResponse(404);

    expect(
      await screen.findByText("Não foi possível encontrar o conteúdo solicitado.")
    ).toBeInTheDocument();
  });
});
