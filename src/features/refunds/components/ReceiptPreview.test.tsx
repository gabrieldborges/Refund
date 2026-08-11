import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import ReceiptPreview from "./ReceiptPreview";

function renderPreview() {
  return render(
    <QueryWrapper>
      <ReceiptPreview refundId="1" refundName="Almoço com cliente" kind="expense" />
    </QueryWrapper>
  );
}

describe("ReceiptPreview", () => {
  // An image receipt renders as an <img> with an accessible name naming the
  // refund, so a screen reader user knows which receipt this is.
  it("renders an image receipt", async () => {
    renderPreview();

    const image = await screen.findByRole("img", { name: /Almoço com cliente/ });
    expect(image).toHaveAttribute("src", expect.stringContaining("token=signed"));
  });

  // A PDF cannot go in an <img>. The component must branch on media_type
  // and render an embed with a link fallback instead.
  it("renders a PDF receipt as an embed with a fallback link", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({
          url: "https://files.example.test/f.pdf?token=signed",
          media_type: "application/pdf",
        })
      )
    );

    renderPreview();

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toHaveAttribute(
      "href",
      expect.stringContaining("token=signed")
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // A 404 (missing file, or someone else's refund) must show a message rather
  // than a broken image frame.
  it("shows an error message when the receipt cannot be loaded", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({ detail: "Refund not found" }, { status: 404 })
      )
    );

    renderPreview();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o comprovante."
    );
  });

  // Fullscreen reuses the very same signed URL: fetching a second one would
  // mean two owners for a resource that has to be revoked exactly once.
  it("opens the receipt in a dialog reusing the same signed URL", async () => {
    const user = userEvent.setup();
    renderPreview();

    const inlineImage = await screen.findByRole("img", { name: /Almoço com cliente/ });
    const inlineSrc = inlineImage.getAttribute("src");

    await user.click(screen.getByRole("button", { name: "Ver comprovante em tela cheia" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", inlineSrc);
  });

  // The image/PDF branch is duplicated (inline vs. dialog) by design, so the
  // dialog copy needs its own coverage — it is the one most likely to drift
  // from the inline copy unnoticed.
  it("opens a PDF receipt in a dialog reusing the same signed URL", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({
          url: "https://files.example.test/f.pdf?token=signed",
          media_type: "application/pdf",
        })
      )
    );

    renderPreview();

    const inlineLink = await screen.findByRole("link", { name: "Abrir comprovante" });
    const inlineHref = inlineLink.getAttribute("href");

    await user.click(screen.getByRole("button", { name: "Ver comprovante em tela cheia" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Abrir comprovante" })).toHaveAttribute(
      "href",
      inlineHref
    );
  });

  // The page used to reflow when the receipt arrived. Two things prevent it,
  // and both are asserted here because neither is visible in a screenshot: the
  // fullscreen button must already occupy its row while the file is still
  // loading (it used to be mounted only afterwards, pushing everything below
  // it down), and the media box must keep a reserved aspect ratio rather than
  // letting the loaded image decide the height.
  it("reserves the layout before the receipt arrives", async () => {
    renderPreview();

    const button = screen.getByRole("button", { name: "Ver comprovante em tela cheia" });
    expect(button).toBeDisabled();

    const image = await screen.findByRole("img", { name: /Almoço com cliente/ });
    expect(image.parentElement).toHaveClass("aspect-[4/3]");
    expect(button).toBeEnabled();
  });

  // kind="payment" hits UC-012's payment-receipt endpoint and uses distinct
  // copy from kind="expense" — the fix for the fullscreen button's
  // accessible name being context-free when two previews share a screen.
  //
  // No handler override here: the default fixtures (msw/handlers.ts) serve a
  // PNG from /receipt and a PDF from /payment-receipt on purpose, so this
  // test only goes green if kind="payment" really reached the payment
  // endpoint. If useReceipt silently ignored `kind` and always called
  // receiptQuery, this would render an <img> instead of the PDF fallback
  // link below, and the query below would fail to find it.
  it("labels the payment receipt distinctly from the expense receipt", async () => {
    render(
      <QueryWrapper>
        <ReceiptPreview refundId="1" refundName="Almoço com cliente" kind="payment" />
      </QueryWrapper>
    );

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toBeInTheDocument();
    expect(screen.getByTitle("Comprovante de pagamento de Almoço com cliente")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver comprovante de pagamento em tela cheia" })
    ).toBeInTheDocument();
  });

  // The qualified string overflowed the card on a 390px screen, so the VISIBLE
  // text is now short. What must not change is the accessible name: with two
  // previews on one screen, two buttons reading "Ver em tela cheia" would be
  // indistinguishable to a screen reader. Hence short text, qualified aria-label.
  it("shows short text on the fullscreen button but keeps the accessible name qualified", async () => {
    renderPreview();

    const button = await screen.findByRole("button", {
      name: "Ver comprovante em tela cheia",
    });
    expect(button).toHaveTextContent("Ver em tela cheia");
    expect(button).not.toHaveTextContent("Ver comprovante em tela cheia");
  });

  // A visible heading is what tells a sighted person which of the two files this
  // is, now that the button no longer says so.
  it("labels the expense preview as a receipt", async () => {
    renderPreview();

    expect(
      await screen.findByRole("heading", { name: "Recibo" })
    ).toBeInTheDocument();
  });

  it("labels the payment preview as a payment receipt", async () => {
    render(
      <QueryWrapper>
        <ReceiptPreview refundId="1" refundName="Almoço com cliente" kind="payment" />
      </QueryWrapper>
    );

    expect(
      await screen.findByRole("heading", { name: "Comprovante de pagamento" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recibo" })).toBeNull();
  });
});
