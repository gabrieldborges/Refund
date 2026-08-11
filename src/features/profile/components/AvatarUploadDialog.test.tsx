import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import AvatarUploadDialog from "./AvatarUploadDialog";

function renderDialog() {
  return render(
    <QueryWrapper>
      <AvatarUploadDialog userId={7} name="Ana Souza" open onOpenChange={vi.fn()} />
    </QueryWrapper>
  );
}

function pngFile(name = "foto.png", bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

describe("AvatarUploadDialog", () => {
  // The field used to inherit the receipt's defaults: label "Comprovante" and
  // placeholder "Nome do arquivo.pdf" — and PDF is exactly the format an avatar does
  // not accept, so the placeholder was telling people the wrong thing.
  it("labels the file field for a picture, not a receipt", async () => {
    renderDialog();

    expect(await screen.findByText("Arquivo da foto")).toBeInTheDocument();
    expect(screen.queryByText("Comprovante")).toBeNull();
    expect(screen.queryByText(/\.pdf/)).toBeNull();
  });

  // Nothing to remove yet, so no remove button: a button that deletes nothing can only
  // produce an error.
  it("offers no remove button when there is no picture", async () => {
    server.use(http.get("*/users/:id/avatar", () => new HttpResponse(null, { status: 404 })));
    renderDialog();

    await screen.findByText("Arquivo da foto");
    expect(screen.queryByRole("button", { name: "Remover" })).toBeNull();
  });

  it("offers a remove button once there is a picture", async () => {
    server.use(
      http.get("*/users/:id/avatar", () =>
        HttpResponse.json({ url: "http://localhost/foto.png", media_type: "image/png" })
      )
    );
    renderDialog();

    expect(await screen.findByRole("button", { name: "Remover" })).toBeInTheDocument();
  });

  // Save is disabled until a valid file is chosen: pressing it with nothing selected
  // would be a request that can only fail.
  it("keeps save disabled until a file is chosen", async () => {
    renderDialog();

    expect(await screen.findByRole("button", { name: "Salvar foto" })).toBeDisabled();
  });

  it("enables save after a valid file is chosen", async () => {
    renderDialog();
    const field = await screen.findByLabelText("Arquivo da foto");

    await userEvent.upload(field, pngFile());

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar foto" })).toBeEnabled()
    );
  });

  // The file LIES about its type: named .pdf while claiming image/png. That is the
  // real case, and the reason both this check and the API's are on the EXTENSION
  // rather than on Content-Type, which whatever client is uploading sets freely.
  //
  // It also has to be this way for the test to reach the code at all: userEvent
  // honours the input's `accept` and refuses a mismatched type outright, so a plainly
  // declared application/pdf would never fire onChange. In a browser `accept` is only
  // a hint for the file picker — drag-and-drop walks around it — which is precisely
  // why the check exists.
  it("refuses a file whose extension is not an image, and keeps save disabled", async () => {
    renderDialog();
    const field = await screen.findByLabelText("Arquivo da foto");

    await userEvent.upload(field, new File(["x"], "recibo.pdf", { type: "image/png" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("JPG ou PNG");
    expect(screen.getByRole("button", { name: "Salvar foto" })).toBeDisabled();
  });

  it("uploads the chosen file", async () => {
    let uploaded = false;
    server.use(
      http.post("*/users/me/avatar", () => {
        uploaded = true;
        return HttpResponse.json({
          type: "User",
          count: 1,
          attributes: { avatar_filename: "abc.png" },
        });
      })
    );

    renderDialog();
    const field = await screen.findByLabelText("Arquivo da foto");
    await userEvent.upload(field, pngFile());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar foto" })).toBeEnabled()
    );

    await userEvent.click(screen.getByRole("button", { name: "Salvar foto" }));

    await waitFor(() => expect(uploaded).toBe(true));
  });
});

describe("AvatarUploadDialog fullscreen", () => {
  // Enlarging exists to SEE the whole photo, so the fullscreen image uses
  // object-contain — the opposite of the avatar itself, where cover crops to fill the
  // circle. Two different jobs, two different fits.
  it("opens the photo enlarged when it is clicked", async () => {
    server.use(
      http.get("*/users/:id/avatar", () =>
        HttpResponse.json({ url: "http://localhost/foto.png", media_type: "image/png" })
      )
    );
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: "Ver a foto em tela cheia" })
    );

    const enlarged = await screen.findByAltText("Ana Souza");
    expect(enlarged).toHaveAttribute("src", "http://localhost/foto.png");
    expect(enlarged.className).toContain("object-contain");
  });

  // No photo, nothing to enlarge: a button that magnifies the initials magnifies
  // nothing, so the avatar is not clickable at all in that state.
  it("offers no way to enlarge when there is no photo", async () => {
    server.use(http.get("*/users/:id/avatar", () => new HttpResponse(null, { status: 404 })));
    renderDialog();

    await screen.findByText("Arquivo da foto");
    expect(screen.queryByRole("button", { name: "Ver a foto em tela cheia" })).toBeNull();
  });
});
