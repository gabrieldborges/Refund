import { http, HttpResponse } from "msw";

// A real 1x1 transparent PNG. The bytes matter less than the Content-Type —
// the preview branches on blob.type — but a decodable image keeps the fixture
// honest if it is ever opened in a real browser.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const receiptPngBytes = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));

// Shared fixtures. Tests import these to assert against the exact data the
// mocked network returned, instead of duplicating literals. Shapes mirror the
// Zod schemas in src/schemas (refund.ts / auth.ts).

// A full Refund as returned by list, detail and create — the three share one
// shape now, so there is a single fixture.
export const refundFixture = {
  id: 1,
  name: "Almoço com cliente",
  category: "food",
  amount_in_cents: 4500,
  status: "pending",
  created_at: "2026-07-20T12:00:00.000Z",
  user: { id: 1, name: "Ana Souza", has_avatar: false },
};

// The login payload, matching loginResponseSchema.
export const loginFixture = {
  access: true,
  id: 1,
  name: "Ana Souza",
  email: "ana@exemplo.com",
  role: "standard",
  token: "fake-jwt-token",
};

// Happy-path handlers. Paths use a leading `*` so they match regardless of the
// axios baseURL (VITE_API_URL), keeping handlers independent of the host.
export const handlers = [
  // Authentication: returns a valid login payload.
  http.post("*/auth/login", () => {
    return HttpResponse.json(loginFixture);
  }),

  // Refund list: a single-item, single-page response. `sum_amount_in_cents` is
  // derived from the returned `attributes`, so it always stays coherent with
  // the fixture data instead of being an independent hardcoded number.
  http.get("*/refunds", () => {
    const attributes = [refundFixture];
    return HttpResponse.json({
      type: "Refund",
      count: attributes.length,
      total: attributes.length,
      sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
      page: 1,
      per_page: 10,
      total_pages: 1,
      attributes,
    });
  }),

  // Receipt: binary body, with the Content-Type the backend derives from the
  // stored extension. There is no JSON here to validate. Must be registered
  // before the `*/refunds/:id` handler below, or the `:id` pattern would
  // swallow `/1/receipt` and the query would try to parse the blob as JSON.
  http.get("*/refunds/:id/receipt", () => {
    return new HttpResponse(receiptPngBytes, {
      headers: { "Content-Type": "image/png" },
    });
  }),

  // Refund detail: echoes the requested id into the fixture.
  http.get("*/refunds/:id", ({ params }) => {
    return HttpResponse.json({
      type: "Refund",
      count: 1,
      attributes: { ...refundFixture, id: Number(params.id) },
    });
  }),

  // Refund creation: same shape as detail, since the API re-reads the row.
  http.post("*/refunds", () => {
    return HttpResponse.json({ type: "Refund", count: 1, attributes: refundFixture }, { status: 201 });
  }),

  // Refund deletion: no body.
  http.delete("*/refunds/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
