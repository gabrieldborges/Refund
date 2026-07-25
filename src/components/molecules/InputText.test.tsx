import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputText from "./InputText";

// Component-level tests for InputText. The label is now associated with the
// input (htmlFor/id), so getByLabelText works — the query Testing Library
// recommends first, and the one a screen reader relies on.

describe("InputText", () => {
  // The label points at the input, and typing reaches it and fires onChange.
  it("associates the label with the input and forwards typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputText label="Nome" onChange={onChange} />);

    const input = screen.getByLabelText("Nome");
    await user.type(input, "Ana");

    expect(input).toHaveValue("Ana");
    expect(onChange).toHaveBeenCalled();
  });

  // An error marks the field invalid and links the message via aria-describedby,
  // so a screen reader announces which field failed and why.
  it("marks the field invalid and links the error message", () => {
    render(<InputText label="E-mail" error="E-mail inválido" />);

    const input = screen.getByLabelText("E-mail");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText("E-mail inválido")).toHaveAttribute("id", describedBy);
  });

  // Without an error, no aria error wiring is added.
  it("has no error wiring when there is no error", () => {
    render(<InputText label="Nome" />);

    const input = screen.getByLabelText("Nome");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});
