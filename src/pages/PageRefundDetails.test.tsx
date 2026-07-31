import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { api } from "@/lib/api";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
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

// Same shape, but the "/" destination carries a loader that awaits GET
// /refunds, mirroring the real homeLoader. That gives a navigation to "/" a
// genuine "loading" window to observe, and returns the router itself so a
// test can drive that navigation directly (see the busy-button test below
// for why that matters more than it first appears).
function renderPageRefundDetailsWithSlowHome() {
  const router = createMemoryRouter(
    [
      { path: "/refunds/:id", Component: PageRefundDetails },
      { path: "/", loader: () => api.get("/refunds"), element: <div>home page</div> },
    ],
    { initialEntries: ["/refunds/1"] }
  );

  const view = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );

  return { ...view, router };
}

function emptyListResponse() {
  return {
    type: "Refund",
    count: 0,
    total: 0,
    sum_amount_in_cents: 0,
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 0,
    attributes: [],
  };
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
    // The status badge, mirroring the fixture's "pending" status.
    expect(screen.getByText("Pendente")).toHaveAttribute("data-variant", "secondary");
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

  // The confirm button must stay busy for as long as any navigation is in
  // flight, not just its own delete request — navigation.state is global to
  // the router, not scoped to whichever action triggered it, so a transition
  // started elsewhere while this dialog is open has to busy it too.
  //
  // This drives the navigation directly through the router instead of by
  // clicking "Confirmar" for real. A real delete closes this dialog
  // (setIsDeleteOpen(false)) in the same tick navigate("/") starts the
  // transition, and Radix's exit animation — which is what keeps the button
  // mounted while it plays in a real browser — does not run in jsdom (no
  // CSS engine), so the dialog unmounts synchronously with nothing left to
  // assert on. Driving the navigation directly isolates the busy computation
  // itself (isDeleting || navigation.state !== "idle") from that unrelated
  // animation-timing gap.
  it("keeps the confirm button busy while a navigation is in flight, even one it did not trigger", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/refunds", async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return HttpResponse.json(emptyListResponse());
      })
    );

    const { router } = renderPageRefundDetailsWithSlowHome();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("button", { name: "Confirmar" })).toBeEnabled();

    void router.navigate("/");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Excluindo/ })).toBeDisabled();
    });
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

  // The receipt is no longer a public URL: the page must render the preview,
  // which fetches the file through the authenticated route.
  it("renders the receipt preview", async () => {
    renderPageRefundDetails();

    expect(
      await screen.findByRole("img", { name: `Comprovante de ${refundFixture.name}` })
    ).toBeInTheDocument();
  });

  // The API has no has_payment_receipt field: a "paid" status is itself the
  // proof the file exists, so the page must show it exactly then.
  //
  // The default MSW fixtures (msw/handlers.ts) serve a PNG from /receipt and
  // a PDF from /payment-receipt on purpose. A link only appears here if the
  // payment-receipt endpoint was genuinely hit — if useReceipt silently
  // ignored `kind` and always called receiptQuery, this would render a
  // second <img> (byte-identical to the expense one) instead, and the
  // assertions below would fail even though a "Comprovante de pagamento"
  // label was still shown somewhere.
  it("renders the payment receipt when the refund is paid", async () => {
    server.use(
      http.get("*/refunds/:id", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, status: "paid" },
        })
      )
    );

    renderPageRefundDetails();

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toBeInTheDocument();
    expect(
      screen.getByTitle(`Comprovante de pagamento de ${refundFixture.name}`)
    ).toBeInTheDocument();
  });

  // A refund that never had a payment made must not show the preview — for
  // every non-paid status, not just the fixture's default "pending". A gate
  // like `status !== "pending"` would wrongly show it for "approved" and
  // "rejected" too, and a test that only tried "pending" would miss that.
  it.each(["pending", "approved", "rejected"] as const)(
    "does not render the payment receipt when the refund is %s",
    async (status) => {
      server.use(
        http.get("*/refunds/:id", () =>
          HttpResponse.json({
            type: "Refund",
            count: 1,
            attributes: { ...refundFixture, status },
          })
        )
      );

      renderPageRefundDetails();

      await screen.findByRole("img", { name: `Comprovante de ${refundFixture.name}` });
      expect(screen.queryByRole("link", { name: "Abrir comprovante" })).not.toBeInTheDocument();
      expect(
        screen.queryByTitle(`Comprovante de pagamento de ${refundFixture.name}`)
      ).not.toBeInTheDocument();
    }
  );

  // With a paid refund, the expense and payment previews render side by
  // side. Two fullscreen buttons with the same accessible name would be
  // indistinguishable to a screen reader user — each must say which receipt
  // it opens, AND belong to that receipt's own preview (swapping the two
  // copy strings between kinds would still pass a test that only checked
  // both strings exist somewhere in the document).
  it("gives the two fullscreen buttons distinct accessible names, each owned by its own preview", async () => {
    server.use(
      http.get("*/refunds/:id", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, status: "paid" },
        })
      )
    );

    renderPageRefundDetails();

    const expenseImage = await screen.findByRole("img", {
      name: `Comprovante de ${refundFixture.name}`,
    });
    const expensePreview = expenseImage.closest("div");
    expect(expensePreview).not.toBeNull();
    expect(
      within(expensePreview!).getByRole("button", { name: "Ver comprovante em tela cheia" })
    ).toBeInTheDocument();

    const paymentLink = screen.getByRole("link", { name: "Abrir comprovante" });
    const paymentPreview = paymentLink.closest("div");
    expect(paymentPreview).not.toBeNull();
    expect(
      within(paymentPreview!).getByRole("button", {
        name: "Ver comprovante de pagamento em tela cheia",
      })
    ).toBeInTheDocument();

    // Sanity: the two assertions above must be scoped to two different
    // previews, not the same one matched twice.
    expect(expensePreview).not.toBe(paymentPreview);
  });
});
