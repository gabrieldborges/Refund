import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DialogContent, {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "./Dialog";

// A minimal composition mirroring how PageRefundDetails wires the dialog.
// It lets us drive the open/close behavior a user actually experiences.
function renderDialog() {
  render(
    <Dialog>
      <DialogTrigger>Abrir</DialogTrigger>
      <DialogContent>
        <DialogTitle>Excluir solicitação</DialogTitle>
        <DialogDescription>Essa ação é irreversível.</DialogDescription>
        <DialogClose>Cancelar</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  // Closed by default; the trigger opens an accessible dialog whose accessible
  // name comes from the title, with the description reachable inside it.
  it("opens from the trigger with an accessible name and description", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = await screen.findByRole("dialog", { name: "Excluir solicitação" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Essa ação é irreversível.")).toBeInTheDocument();
  });

  // The close button dismisses the dialog.
  it("closes from the close button", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
