import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RefundsToolbar from "./RefundsToolbar";

describe("RefundsToolbar", () => {
  it("shows the current filter, defaulting to every status", () => {
    render(<RefundsToolbar status={undefined} onStatusChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Filtrar por status" })).toHaveTextContent("Todos");
  });

  it("shows the selected status when one is active", () => {
    render(<RefundsToolbar status="paid" onStatusChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Filtrar por status" })).toHaveTextContent("Pago");
  });

  it("reports the chosen status to the caller", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<RefundsToolbar status={undefined} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Aprovado" }));

    expect(onStatusChange).toHaveBeenCalledWith("approved");
  });

  // "Todos" is the absence of a filter, and the caller's contract says that is
  // `undefined`. Radix forbids an empty-string SelectItem value, so the
  // sentinel exists inside the component and must not leak out of it.
  it("reports undefined, not a sentinel string, when every status is chosen", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<RefundsToolbar status="paid" onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Todos" }));

    expect(onStatusChange).toHaveBeenCalledWith(undefined);
  });
});
