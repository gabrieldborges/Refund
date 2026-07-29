import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { formatCentsToBRL } from "@/lib/format";
import PageRefundDetails from "./PageRefundDetails";

// Mounts PageRefundDetails at "/refunds/:id", with a marker "/" route so
// navigation after a successful delete can be observed as a route change.
function renderPageRefundDetails() {
  const router = createMemoryRouter(
    [
      { path: "/refunds/:id", Component: PageRefundDetails },
      { path: "/", element: <div>home page</div> },
    ],
    { initialEntries: ["/refunds/1"] }
  );

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );
}

describe("PageRefundDetails", () => {
  // Happy path: once the refund loads, its name, category and amount are shown.
  it("shows the refund details once loaded", async () => {
    renderPageRefundDetails();

    expect(await screen.findByText(refundFixture.name)).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor")).toHaveValue(
      formatCentsToBRL(refundFixture.amount_in_cents)
    );
  });

  // The detail fetch can fail (e.g. a bad id) — the page must show an error
  // message instead of rendering stale or empty fields.
  it("shows an error message when the refund cannot be loaded", async () => {
    server.use(http.get("*/refunds/:id", () => HttpResponse.json({}, { status: 404 })));

    renderPageRefundDetails();

    expect(
      await screen.findByText("Não foi possível encontrar essa solicitação.")
    ).toBeInTheDocument();
  });

  // Clicking "Excluir" opens a confirmation dialog; cancelling it must close
  // the dialog without ever calling the delete endpoint.
  it("opens a confirmation dialog and cancels without deleting", async () => {
    const user = userEvent.setup();
    let deleteCalls = 0;
    server.use(
      http.delete("*/refunds/:id", () => {
        deleteCalls += 1;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderPageRefundDetails();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteCalls).toBe(0);
  });

  // Confirming the dialog deletes the refund and navigates back to the home
  // route, mirroring the pre-migration behaviour.
  it("deletes the refund and navigates home on confirm", async () => {
    const user = userEvent.setup();
    renderPageRefundDetails();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("home page")).toBeInTheDocument();
  });

  // If the API rejects the deletion, the dialog stays open and shows the
  // error instead of silently navigating away.
  it("shows an error message and keeps the dialog open when deletion fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.delete("*/refunds/:id", () =>
        HttpResponse.json({ detail: "Falha ao excluir" }, { status: 500 })
      )
    );

    renderPageRefundDetails();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Falha ao excluir")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
