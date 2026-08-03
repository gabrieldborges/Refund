import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import ContentError from "./ContentError";

// Mounts ContentError as the boundary of a route whose loader fails only on
// the first call, so retry has something to recover into.
function renderWithFlakyLoader() {
  let calls = 0;

  const router = createMemoryRouter(
    [
      {
        path: "/",
        ErrorBoundary: ContentError,
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContentError", () => {
  // A 500 is not one of the statuses getRouteErrorMessage special-cases, so it
  // must fall through to the generic message rather than render an empty slot.
  it("shows the generic message for a 500 route error", async () => {
    renderWithFlakyLoader();

    expect(
      await screen.findByText("Não foi possível carregar esta página. Tente novamente.")
    ).toBeInTheDocument();
  });

  // Unlike PageRouteError, this one renders inside the shell, which already
  // owns the document's only <main>. Adding a second landmark here would make
  // assistive-tech navigation ambiguous.
  it("renders no main landmark of its own", () => {
    renderWithFlakyLoader();

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("recovers in place when retry is pressed", async () => {
    renderWithFlakyLoader();

    await userEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("conteúdo carregado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Algo deu errado" })).not.toBeInTheDocument();
  });
});
