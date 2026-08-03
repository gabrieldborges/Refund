import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import AppErrorBoundary from "./AppErrorBoundary";

function Boom(): ReactNode {
  throw new Error("boom");
}

// React logs every caught error to console.error. Silencing it keeps the
// suite output readable; the assertions below still prove the boundary ran.
function silenceReactErrorLog() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  // The happy path: a boundary that never fires must be invisible.
  it("renders its children when nothing throws", () => {
    render(
      <AppErrorBoundary>
        <p>conteúdo</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  // The reason the component exists: a render error anywhere below must
  // produce a fallback instead of an unmounted (blank) tree.
  it("renders the fallback when a child throws during render", () => {
    silenceReactErrorLog();

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );

    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  // The fallback is rendered outside RouterProvider, so its only recovery is
  // a document reload. Asserting the call keeps that contract explicit.
  it("reloads the document when the recovery button is pressed", async () => {
    silenceReactErrorLog();
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );

    await userEvent.click(screen.getByRole("button", { name: "Recarregar a página" }));

    expect(reload).toHaveBeenCalledOnce();
  });

  // The fallback replaces the whole document, so it must carry exactly one
  // main landmark — the same rule PageRouteError follows.
  it("exposes exactly one main landmark", () => {
    silenceReactErrorLog();

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
