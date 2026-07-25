import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryWrapper } from "../../test/utils";
import RefundFormDialog from "./RefundFormDialog";

describe("RefundFormDialog", () => {
  // Submitting empty must move focus to the first invalid field, so a keyboard
  // user is taken straight to what needs fixing. This works because react-hook-
  // form focuses the first errored field whose ref it holds — and the register
  // ref reaches our InputText's <input>, which is also marked aria-invalid.
  it("focuses the first invalid field on submit", async () => {
    const user = userEvent.setup();
    render(
      <QueryWrapper>
        <MemoryRouter>
          <RefundFormDialog open onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryWrapper>
    );

    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    const firstField = screen.getByLabelText("Nome da solicitação");
    expect(firstField).toHaveAttribute("aria-invalid", "true");
    expect(firstField).toHaveFocus();
  });
});
