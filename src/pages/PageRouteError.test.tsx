import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mounts a route whose loader fails only on the first call, so the retry
// button has something to recover into.
function renderWithFlakyLoader() {
  let calls = 0;

  const router = createMemoryRouter(
    [
      {
        path: "/",
        ErrorBoundary: PageRouteError,
        loader: () => {
          calls += 1;
          if (calls === 1) {
            throw new Response(null, { status: 500 });
          }
          return null;
        },
        Component: () => <p>conteúdo carregado</p>,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

// Same shape, but the failure happens while RENDERING the route component
// rather than in its loader — a different code path inside react-router.
//
// The throw is controlled from OUTSIDE the component on purpose. A component
// that clears its own flag while throwing never reaches the boundary at all:
// React retries a failed concurrent render before surfacing it, and that
// retry succeeds. The flag must survive until the test itself flips it.
function renderWithFlakyRender() {
  const control = { shouldThrow: true };

  const router = createMemoryRouter(
    [
      {
        path: "/",
        ErrorBoundary: PageRouteError,
        loader: () => null,
        Component: () => {
          if (control.shouldThrow) {
            throw new Error("render boom");
          }
          return <p>conteúdo carregado</p>;
        },
      },
    ],
    { initialEntries: ["/"] }
  );

  render(<RouterProvider router={router} />);
  return control;
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

  // The point of the retry button: a failed LOADER is re-run in place, so the
  // user recovers without navigating away from the route that failed.
  it("recovers from a loader failure when retry is pressed", async () => {
    renderWithFlakyLoader();

    await userEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("conteúdo carregado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algo deu errado" })).not.toBeInTheDocument();
  });

  // Retry also clears a RENDER error, not just a loader one. This was an open
  // question when the item was planned — revalidate() re-runs loaders, and it
  // was not obvious that react-router would also reset the boundary it had
  // rendered for a failed render. It does. Locked in as a test because the
  // retry button would silently become a no-op for this case otherwise.
  it("recovers from a render failure when retry is pressed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const control = renderWithFlakyRender();

    expect(await screen.findByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    control.shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("conteúdo carregado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algo deu errado" })).not.toBeInTheDocument();
  });
});
