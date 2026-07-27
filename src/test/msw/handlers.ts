import { http, HttpResponse } from "msw";

// Shared fixtures. Tests import these to assert against the exact data the
// mocked network returned, instead of duplicating literals. Shapes mirror the
// Zod schemas in src/schemas (refund.ts / auth.ts).

// A full Refund as returned by list and detail (includes created_at).
export const refundFixture = {
  id: 1,
  user_id: 1,
  name: "Almoço com cliente",
  category: "food",
  amount_in_cents: 4500,
  filename: "recibo.png",
  created_at: "2026-07-20T12:00:00.000Z",
};

// The login payload, matching loginResponseSchema.
export const loginFixture = {
  access: true,
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
      per_page: 6,
      total_pages: 1,
      attributes,
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

  // Refund creation: the API does not return created_at here.
  http.post("*/refunds", () => {
    const { created_at, ...base } = refundFixture;
    void created_at;
    return HttpResponse.json({ type: "Refund", count: 1, attributes: base }, { status: 201 });
  }),

  // Refund deletion: no body.
  http.delete("*/refunds/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
