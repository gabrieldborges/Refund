import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputText from "./InputText";

// Component-level tests for InputText in isolation. Note: the label is not
// associated with the <input> (no htmlFor/id), so getByLabelText would not find
// it — an accessibility gap tracked for Item 7. We query by placeholder instead.

describe("InputText", () => {
  // Typing reaches the underlying input and fires onChange.
  it("forwards typing to the input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputText placeholder="Nome" onChange={onChange} />);

    const input = screen.getByPlaceholderText("Nome");
    await user.type(input, "Ana");

    expect(input).toHaveValue("Ana");
    expect(onChange).toHaveBeenCalled();
  });

  // The label text is rendered next to the field (even if not yet linked to it).
  it("renders the label text", () => {
    render(<InputText label="E-mail" placeholder="voce@exemplo.com" />);

    expect(screen.getByText("E-mail")).toBeInTheDocument();
  });

  // When an error is provided, its message is shown.
  it("shows the error message when provided", () => {
    render(<InputText placeholder="Nome" error="Campo obrigatório" />);

    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();
  });
});
