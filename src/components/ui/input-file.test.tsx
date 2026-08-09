import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputFile from "./input-file";

describe("InputFile", () => {
  // The label must be associated with the input, so it can be found by name.
  it("associates its label with the input", () => {
    render(<InputFile label="Comprovante" />);
    expect(screen.getByLabelText("Comprovante")).toBeInTheDocument();
  });

  // Choosing a file must replace the placeholder with the file name. This is
  // the one behaviour the wrapper adds on top of the native input, and it also
  // covers the `file` field that the schema unit test could not exercise.
  it("shows the chosen file name", async () => {
    render(<InputFile label="Comprovante" placeholder="Nome do arquivo.pdf" />);

    const file = new File(["nota"], "nota-fiscal.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("Comprovante"), file);

    expect(screen.getByText("nota-fiscal.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Nome do arquivo.pdf")).not.toBeInTheDocument();
  });

  // FormControl (a Radix Slot) clones its child and injects `id`,
  // `aria-invalid` and `aria-describedby` derived from react-hook-form's field
  // state. Those props must reach the inner <input> — not be dropped on the
  // outer wrapper — and the passed `id` must win over the internally
  // generated one, since the FormLabel's `htmlFor` points at it.
  it("forwards an externally provided id and aria-describedby to the input", () => {
    render(
      <InputFile
        label="Comprovante"
        id="file-form-item"
        aria-describedby="file-form-item-message"
        aria-invalid={true}
      />
    );

    const input = screen.getByLabelText("Comprovante");
    expect(input).toHaveAttribute("id", "file-form-item");
    expect(input).toHaveAttribute("aria-describedby", "file-form-item-message");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  // The native control renders "Choose File / No file chosen" from the
  // BROWSER's locale, and that text is reachable from neither CSS nor JS. It
  // showed in English inside a Portuguese interface, permanently — the only
  // fix is to replace the control, so this asserts the replacement is there.
  it("shows a translated trigger instead of the browser's own text", () => {
    render(<InputFile label="Comprovante" />);

    expect(screen.getByText("Escolher arquivo")).toBeInTheDocument();
  });

  // Hiding the input must not hide it from assistive technology: sr-only, not
  // display:none. A file field nobody can reach by keyboard is worse than one
  // labelled in the wrong language.
  it("keeps the real input focusable and named by its field label", () => {
    render(<InputFile label="Comprovante" />);

    const input = screen.getByLabelText("Comprovante");
    input.focus();

    expect(input).toHaveFocus();
    // The visible trigger is a second <label> for the same input; without
    // aria-labelledby the accessible name would become both concatenated.
    expect(input).toHaveAccessibleName("Comprovante");
  });

  // Clicking the visible surface must open the picker — that is what makes the
  // replacement a replacement and not just decoration.
  it("the visible trigger is wired to the input", () => {
    render(<InputFile label="Comprovante" id="meu-arquivo" />);

    const trigger = screen.getByText("Escolher arquivo").closest("label");
    expect(trigger).toHaveAttribute("for", "meu-arquivo");
  });
});
