import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import RefundFormDialog from "./RefundFormDialog";

// Mounts RefundFormDialog at "/" through a real data router, with a "/success"
// destination it navigates to on a successful submit. A data router (not the
// declarative <MemoryRouter>) is required now that the dialog reads
// useNavigation(), which throws outside one.
function renderDialog() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <RefundFormDialog open onOpenChange={() => {}} /> },
      { path: "/success", element: <div>success page</div> },
    ],
    { initialEntries: ["/"] }
  );

  const view = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );

  return { ...view, router };
}

// Same shape, but "/success" carries a loader that stays pending for a beat
// before resolving, giving a navigation to it a genuine "loading" window to
// observe. PageSuccess itself has no loader in the real router (it fetches
// nothing) — this is a synthetic stand-in purely so a test has a transition
// to watch, not a claim about what production does.
function renderDialogWithSlowSuccess() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <RefundFormDialog open onOpenChange={() => {}} /> },
      {
        path: "/success",
        loader: () => new Promise((resolve) => setTimeout(resolve, 80)),
        element: <div>success page</div>,
      },
    ],
    { initialEntries: ["/"] }
  );

  const view = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );

  return { ...view, router };
}

// Keeps `open` as real controlled state (a `setOpen` prop alone would not do:
// the dialog must survive a close/reopen cycle as the same mounted instance,
// which is what actually exercises whether its internal form state was reset
// rather than merely never having existed). The "Reabrir" button is the only
// way back in, since RefundFormDialog itself has no open trigger of its own.
function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <RefundFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderHarness() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Harness /> },
      { path: "/success", element: <div>success page</div> },
    ],
    { initialEntries: ["/"] }
  );

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
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

  // navigation.state is global to the router, not scoped to whichever action
  // triggered it — a transition already under way while this dialog is open
  // must busy its submit button too.
  //
  // This drives the navigation directly through the router instead of
  // through a real successful submit. A real submit closes this dialog
  // (onOpenChange(false)) in the same tick navigate("/success") starts the
  // transition, and the Radix exit animation that keeps a closing dialog
  // mounted while it plays does not run in jsdom (no CSS engine) — the
  // dialog would unmount synchronously with nothing left to assert on.
  // Driving the navigation directly isolates the busy computation itself
  // (isPending || navigation.state !== "idle") from that unrelated
  // animation-timing gap — the same reasoning PageRefundDetails.test.tsx
  // spells out for its own confirm button.
  it("keeps the submit button busy while a navigation is in flight, even one it did not trigger", async () => {
    const { router } = renderDialogWithSlowSuccess();

    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();

    void router.navigate("/success");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled();
    });
  });

  // Cancelling must not leave the next visitor holding someone else's draft.
  // The success path already resets; this is the path that did not — closing
  // via Escape exercises the same Radix onOpenChange callback that the X
  // button and an outside click also go through.
  it("clears the form when reopened after cancelling", async () => {
    const user = userEvent.setup();
    renderHarness();

    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText("Nome da solicitação"), "Almoço");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Reabrir" }));

    expect(await screen.findByLabelText("Nome da solicitação")).toHaveValue("");
  });

  // A second, separate piece of dialog state besides the form: the error
  // banner from a previous failed attempt is the same class of "stale
  // draft" problem — closing and reopening should not greet the user with
  // someone else's old failure.
  it("clears the error banner when reopened after cancelling a failed submit", async () => {
    server.use(http.post("*/refunds", () => HttpResponse.json({}, { status: 500 })));
    const user = userEvent.setup();
    renderHarness();

    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText("Nome da solicitação"), "Almoço com cliente");
    await user.click(screen.getByRole("combobox", { name: "Categoria" }));
    await user.click(await screen.findByRole("option", { name: "Alimentação" }));
    await user.type(screen.getByLabelText("Valor"), "42.50");
    await user.upload(
      screen.getByLabelText("Comprovante"),
      new File(["conteúdo"], "nota-fiscal.pdf", { type: "application/pdf" })
    );
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await screen.findByRole("alert");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
