import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateRefund } from "./useCreateRefund";
import type { RefundCreateFormData } from "../schemas/refund";

// A valid form payload. `file` is typed as FileList in the app, but the hook
// only reads file[0] to build FormData, so an array with one File is enough at
// runtime (cast for the compiler).
const validData = {
  name: "Almoço com cliente",
  category: "food",
  amount: 45,
  file: [new File(["dummy"], "recibo.png", { type: "image/png" })],
} as unknown as RefundCreateFormData;

describe("useCreateRefund", () => {
  // Happy path: the create response (the API re-reads the row, so it is a full
  // Refund with created_at) is parsed and returned.
  it("creates a refund and parses the response", async () => {
    const { result } = renderHook(() => useCreateRefund(), { wrapper: QueryWrapper });

    result.current.mutate(validData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe(refundFixture.name);
  });

  // Error path: a 422 makes the mutation fail and getApiErrorMessage reads the
  // message. Since Item 23 the API answers RFC 9457, so `detail` is a sentence
  // and the per-field information sits in `errors` — this fixture used to
  // carry the old list-shaped detail, which is the format that no longer
  // exists.
  it("surfaces a 422 validation message", async () => {
    server.use(
      http.post("*/refunds", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Unprocessable Entity",
            status: 422,
            detail: "Arquivo é obrigatório",
            instance: "/refunds",
            request_id: "req-test",
            errors: [{ field: "file", message: "Arquivo é obrigatório" }],
          },
          { status: 422 }
        )
      )
    );
    const { result } = renderHook(() => useCreateRefund(), { wrapper: QueryWrapper });

    result.current.mutate(validData);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getApiErrorMessage(result.current.error)).toBe("Arquivo é obrigatório");
  });
});
