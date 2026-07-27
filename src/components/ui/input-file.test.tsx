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
});
