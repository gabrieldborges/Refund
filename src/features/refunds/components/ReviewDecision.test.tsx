import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import type { RefundStatus } from "../schemas/refund";
import ReviewDecision from "./ReviewDecision";

function renderDecision(status: RefundStatus, onMarkAsPaid = () => {}) {
  render(
    <QueryWrapper>
      <ReviewDecision refundId="1" status={status} onMarkAsPaid={onMarkAsPaid} />
    </QueryWrapper>
  );
}

describe("ReviewDecision", () => {
  // The four rows of UC-007's transition table. The button for the CURRENT
  // status must never render — not even disabled — because that is exactly
  // the transition the API answers 422 for (setting a refund to the status
  // it already has).
  it("shows Aprovar and Rejeitar for a pending refund", () => {
    renderDecision("pending");

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  it("shows Rejeitar and Marcar como pago for an approved refund", () => {
    renderDecision("approved");

    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como pago" })).toBeInTheDocument();
  });

  it("shows only Aprovar for a rejected refund", () => {
    renderDecision("rejected");

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeitar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  // paid is terminal: no decision can ever be applied to it again, so no
  // button is offered at all.
  it("shows no decision buttons for a paid refund", () => {
    renderDecision("paid");

    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeitar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  // The API answers 422 when `reason` is missing on a rejection (UC-007).
  // Confirming an empty reason must therefore never reach the network: the
  // Zod validation has to stop the submit before the mutation fires.
  it("does not fire the mutation when a rejection is confirmed with an empty reason", async () => {
    let patchCalls = 0;
    server.use(
      http.patch("*/refunds/:id/status", () => {
        patchCalls += 1;
        return HttpResponse.json({ id: 1, status: "rejected" });
      })
    );

    const user = userEvent.setup();
    renderDecision("pending");

    await user.click(screen.getByRole("button", { name: "Rejeitar" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Motivo é obrigatório")).toBeInTheDocument();
    expect(patchCalls).toBe(0);
    // The dialog stays open so the user can fix the field.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("fires the mutation with the typed reason when a rejection is confirmed", async () => {
    let patchBody: unknown;
    server.use(
      http.patch("*/refunds/:id/status", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ id: 1, status: "rejected" });
      })
    );

    const user = userEvent.setup();
    renderDecision("pending");

    await user.click(screen.getByRole("button", { name: "Rejeitar" }));
    await user.type(screen.getByLabelText("Motivo"), "Comprovante ilegível");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(patchBody).toEqual({ status: "rejected", reason: "Comprovante ilegível" })
    );
    // The dialog closes and the form resets once the mutation succeeds.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Approving sends only `{ status: "approved" }` — no `reason` key at all,
  // since `reason` is `undefined` and JSON.stringify drops undefined props.
  // A wrong body or wrong endpoint here would otherwise go unnoticed: no
  // other test asserts what clicking Aprovar actually sends.
  it("fires the mutation with { status: \"approved\" } and no reason when Aprovar is clicked", async () => {
    let patchBody: unknown;
    server.use(
      http.patch("*/refunds/:id/status", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ id: 1, status: "approved" });
      })
    );

    const user = userEvent.setup();
    renderDecision("pending");

    await user.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(patchBody).toEqual({ status: "approved" }));
  });

  it("wires the Marcar como pago button to the given callback", async () => {
    let called = false;
    const user = userEvent.setup();
    renderDecision("approved", () => {
      called = true;
    });

    await user.click(screen.getByRole("button", { name: "Marcar como pago" }));

    expect(called).toBe(true);
  });
});
