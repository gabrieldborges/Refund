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
      <ReceiptPreview refundId="1" refundName="Almoço com cliente" />
    </QueryWrapper>
  );
}

describe("ReceiptPreview", () => {
  // An image receipt renders as an <img> with an accessible name naming the
  // refund, so a screen reader user knows which receipt this is.
  it("renders an image receipt", async () => {
    renderPreview();

    const image = await screen.findByRole("img", { name: /Almoço com cliente/ });
    expect(image).toHaveAttribute("src", expect.stringMatching(/^blob:/));
  });

  // A PDF cannot go in an <img>. The component must branch on the blob's type
  // and render an embed with a link fallback instead.
  it("renders a PDF receipt as an embed with a fallback link", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { "Content-Type": "application/pdf" },
        })
      )
    );

    renderPreview();

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^blob:/)
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

  // Fullscreen reuses the very same object URL: creating a second one would
  // mean two owners for a resource that has to be revoked exactly once.
  it("opens the receipt in a dialog reusing the same object URL", async () => {
    const user = userEvent.setup();
    renderPreview();

    const inlineImage = await screen.findByRole("img", { name: /Almoço com cliente/ });
    const inlineSrc = inlineImage.getAttribute("src");

    await user.click(screen.getByRole("button", { name: "Ver em tela cheia" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", inlineSrc);
  });

  // The image/PDF branch is duplicated (inline vs. dialog) by design, so the
  // dialog copy needs its own coverage — it is the one most likely to drift
  // from the inline copy unnoticed.
  it("opens a PDF receipt in a dialog reusing the same object URL", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { "Content-Type": "application/pdf" },
        })
      )
    );

    renderPreview();

    const inlineLink = await screen.findByRole("link", { name: "Abrir comprovante" });
    const inlineHref = inlineLink.getAttribute("href");

    await user.click(screen.getByRole("button", { name: "Ver em tela cheia" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Abrir comprovante" })).toHaveAttribute(
      "href",
      inlineHref
    );
  });
});
