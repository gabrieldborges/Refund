import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryWrapper } from "@/test/utils";
import RefundFormDialog from "./RefundFormDialog";

function renderDialog() {
  render(
    <QueryWrapper>
      <MemoryRouter>
        <RefundFormDialog open onOpenChange={() => {}} />
      </MemoryRouter>
    </QueryWrapper>
  );
}

describe("RefundFormDialog", () => {
  // Submitting empty must move focus to the first invalid field, so a keyboard
  // user is taken straight to what needs fixing. This works because react-hook-
  // form focuses the first errored field whose ref it holds — and the field's
  // ref reaches the shadcn Input's <input>, which is also marked aria-invalid.
  it("focuses the first invalid field on submit", async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    const firstField = screen.getByLabelText("Nome da solicitação");
    expect(firstField).toHaveAttribute("aria-invalid", "true");
    expect(firstField).toHaveFocus();
  });

  // The category is now a real Select: it exposes the combobox role and its
  // options are reachable by keyboard, which the old div-based popover could not
  // do without hand-written key handling.
  it("lets the user pick a category with the keyboard", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("combobox", { name: "Categoria" }));
    await userEvent.click(await screen.findByRole("option", { name: "Alimentação" }));

    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveTextContent("Alimentação");
  });

  // The shadcn Form wires aria-invalid/aria-describedby on its own, the same
  // way PageLogin.test.tsx proves it for the email field. Here the field is
  // InputFile: a rejected file must mark it invalid and link it to its
  // message once the form is submitted. The file is oversized rather than
  // wrong-extension because `userEvent.upload` filters candidates against the
  // input's `accept` attribute the same way a real file picker would — a
  // mismatched extension never reaches the input's FileList at all.
  it("marks the file field invalid and links it to its message when the file is rejected", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nome da solicitação"), "Almoço com cliente");
    await user.click(screen.getByRole("combobox", { name: "Categoria" }));
    await user.click(await screen.findByRole("option", { name: "Alimentação" }));
    await user.type(screen.getByLabelText("Valor"), "42.50");

    const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024)], "nota-fiscal.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Comprovante"), oversizedFile);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    const fileField = await screen.findByLabelText("Comprovante");
    expect(fileField).toHaveAttribute("aria-invalid", "true");
    expect(fileField).toHaveAccessibleDescription("Arquivo deve ter no máximo 4MB");
  });
});
