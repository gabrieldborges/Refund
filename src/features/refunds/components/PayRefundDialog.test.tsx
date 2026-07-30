import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { payRefundSchema } from "../schemas/refund";
import PayRefundDialog from "./PayRefundDialog";

// Mirrors user-event's own internal FileList builder
// (@testing-library/user-event/dist/cjs/utils/dataTransfer/FileList.js): this
// project's jsdom has no global `DataTransfer` constructor, so a FileList
// cannot be produced through the real DOM upload APIs in a unit test. This
// helper only feeds payRefundSchema directly — it is not a substitute for
// `userEvent.upload`, which is still used below for the cases the rendered
// <input> can exercise.
function createFileList(files: File[]): FileList {
  const list = {
    ...files,
    length: files.length,
    item: (index: number) => list[index] ?? null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < list.length; i++) yield list[i];
    },
  } as unknown as FileList;
  Object.setPrototypeOf(list, FileList.prototype);
  return list;
}

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <QueryWrapper>
      <PayRefundDialog refundId="1" open onOpenChange={onOpenChange} />
    </QueryWrapper>
  );
  return { onOpenChange };
}

describe("payRefundSchema.shape.file", () => {
  // Extension rejection is exercised straight against the schema: as the
  // suite's own history shows (see RefundFormDialog.test.tsx),
  // `userEvent.upload` filters candidates against the input's `accept`
  // attribute the same way a real file picker would, so a `.exe` never
  // reaches the input's FileList at all.
  it("rejects a file with a disallowed extension", () => {
    const files = createFileList([
      new File(["x"], "comprovante.exe", { type: "application/x-msdownload" }),
    ]);

    const result = payRefundSchema.shape.file.safeParse(files);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Arquivo deve ser JPG, PNG ou PDF");
    }
  });

  // A valid extension over the 4MB limit is rejected on size, independent of
  // the extension check above.
  it("rejects a file over 4MB", () => {
    const files = createFileList([
      new File([new Uint8Array(5 * 1024 * 1024)], "comprovante.pdf", { type: "application/pdf" }),
    ]);

    const result = payRefundSchema.shape.file.safeParse(files);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Arquivo deve ter no máximo 4MB");
    }
  });
});

describe("PayRefundDialog", () => {
  // The file is mandatory (UC-012, BR-022): there is no `has_payment_receipt`
  // field anywhere in the API because `status === "paid"` already implies the
  // receipt exists. Submitting with nothing attached must fail validation and
  // never reach the network — this is the guard proven red/green below.
  it("does not submit and shows the required-file message when no file is attached", async () => {
    const user = userEvent.setup();
    let paymentCalls = 0;
    server.use(
      http.post("*/refunds/:id/payment", () => {
        paymentCalls += 1;
        return new HttpResponse(null, { status: 200 });
      })
    );
    renderDialog();

    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Confirmar pagamento" }));

    const fileField = await screen.findByLabelText("Comprovante de pagamento");
    expect(fileField).toHaveAttribute("aria-invalid", "true");
    expect(fileField).toHaveAccessibleDescription("Anexe o comprovante de pagamento");
    expect(paymentCalls).toBe(0);
  });

  // Same accessible-error wiring as RefundFormDialog: a rejected file (valid
  // extension, over the size limit) must mark the field invalid and link it
  // to its message.
  it("marks the file field invalid and links it to its message when the file is oversized", async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByRole("dialog");
    const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024)], "comprovante.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Comprovante de pagamento"), oversizedFile);
    await user.click(screen.getByRole("button", { name: "Confirmar pagamento" }));

    const fileField = await screen.findByLabelText("Comprovante de pagamento");
    expect(fileField).toHaveAttribute("aria-invalid", "true");
    expect(fileField).toHaveAccessibleDescription("Arquivo deve ter no máximo 4MB");
  });

  // Happy path: a valid file lets the form pass validation and the mutation
  // succeed, which closes the dialog. The request body itself (the `file`
  // field of the multipart POST) is exercised by usePayRefund's own
  // reasoning, mirrored from useCreateRefund; parsing it back with
  // `request.formData()` here would hit an unrelated jsdom-File vs
  // Node-undici-File cross-realm bug in MSW's multipart parser, the same
  // landmine useCreateRefund.test.tsx already avoids by not inspecting the
  // uploaded body server-side.
  it("submits the mutation with the attached file and closes the dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/refunds/:id/payment", () => new HttpResponse(null, { status: 200 }))
    );
    const { onOpenChange } = renderDialog();

    await screen.findByRole("dialog");
    const validFile = new File(["dummy"], "comprovante.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Comprovante de pagamento"), validFile);
    await user.click(screen.getByRole("button", { name: "Confirmar pagamento" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
