import { http, HttpResponse } from "msw";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
import { USERS_PER_PAGE } from "@/features/team";

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

// The team directory (UC-015 / UC-016). Two people with different roles, so a
// test can tell the two badges apart, and one with a null created_at, because
// the column is nullable and one row without a date must not break the table.
export const usersFixture = [
  {
    id: 1,
    name: "Ana Souza",
    email: "ana@example.com",
    role: "standard" as const,
    has_avatar: false,
    created_at: "2026-01-02T03:04:05",
  },
  {
    id: 2,
    name: "Chefe Silva",
    email: "chefe@example.com",
    role: "admin" as const,
    has_avatar: false,
    created_at: null,
  },
];


// The aggregate the dashboard reads (UC-017). Deliberately shaped so the tests can
// tell real behaviour from coincidence: one month in the MIDDLE of the window is
// zero (so the zero-filling test cannot pass by accident), and approved + paid is
// different from the sum of all four (so the settled-value test cannot pass by
// summing everything).
function bucket(count: number, cents: number) {
  return { count, amount_in_cents: cents };
}

const EMPTY_STATUSES = {
  pending: bucket(0, 0),
  approved: bucket(0, 0),
  paid: bucket(0, 0),
  rejected: bucket(0, 0),
};

export const refundSummaryFixture = {
  type: "RefundSummary" as const,
  scope: "user" as const,
  months: 3,
  by_status: {
    pending: bucket(2, 3000),
    approved: bucket(3, 5000),
    paid: bucket(1, 1000),
    rejected: bucket(4, 9000),
  },
  by_category: {
    food: bucket(4, 18000),
    lodging: bucket(0, 0),
    transport: bucket(5, 37000),
    service: bucket(1, 90000),
    others: bucket(0, 0),
  },
  by_month: [
    {
      month: "2026-06",
      count: 3,
      amount_in_cents: 4000,
      by_status: { ...EMPTY_STATUSES, paid: bucket(1, 1000), pending: bucket(2, 3000) },
    },
    // The empty month sits in the middle on purpose.
    { month: "2026-07", count: 0, amount_in_cents: 0, by_status: { ...EMPTY_STATUSES } },
    {
      month: "2026-08",
      count: 7,
      amount_in_cents: 14000,
      by_status: { ...EMPTY_STATUSES, approved: bucket(3, 5000), rejected: bucket(4, 9000) },
    },
  ],
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

// A refund's review history: rejected, then approved, then paid. A fixture
// with only null reasons could not distinguish "moved forward" from "was
// discarded" — the rejection reason is the one field this endpoint exists
// to expose. Ordered oldest to newest, mirroring the chronological order
// UC-013 says the API returns.
export const refundReviewsFixture = [
  {
    from_status: "pending",
    to_status: "rejected",
    reason: "Comprovante ilegível",
    reviewer: { id: 1, name: "Gabriel" },
    created_at: "2026-07-30T09:00:00.000Z",
  },
  {
    from_status: "pending",
    to_status: "approved",
    reason: null,
    reviewer: { id: 1, name: "Gabriel" },
    created_at: "2026-07-30T10:00:00.000Z",
  },
  {
    from_status: "approved",
    to_status: "paid",
    reason: null,
    reviewer: { id: 1, name: "Gabriel" },
    created_at: "2026-07-30T14:20:00.000Z",
  },
];

// Per-status counts and cent sums for a user, matching refundStatsResponseSchema.
// No cross-status total, on purpose: see the schema's comment in refund.ts.
export const refundStatsFixture = {
  type: "RefundStats",
  user_id: 1,
  by_status: {
    pending: { count: 2, amount_in_cents: 30000 },
    approved: { count: 5, amount_in_cents: 65000 },
    paid: { count: 3, amount_in_cents: 40000 },
    rejected: { count: 1, amount_in_cents: 10000 },
  },
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
      per_page: REFUNDS_PER_PAGE,
      total_pages: 1,
      attributes,
    });
  }),

  // Receipt: since Item 22 this answers a short-lived SIGNED URL plus the
  // media type, not the bytes. The media type is what the preview branches on
  // to pick <img> or <object>, and it has to arrive with the URL because a URL
  // carries no type. Registered before `*/refunds/:id` below purely as hygiene
  // (most-specific-first); path-to-regexp's `:id` never spans a `/`, so
  // `*/refunds/:id` does not actually match `/refunds/1/receipt` — this was
  // verified, not assumed.
  http.get("*/refunds/:id/receipt", ({ params }) => {
    return HttpResponse.json({
      url: `https://files.example.test/receipts/${params.id}.png?token=signed`,
      media_type: "image/png",
    });
  }),

  // Payment receipt (UC-012's sibling of the handler above): same shape, same
  // most-specific-first registration reasoning, distinct path so a test can
  // tell the two apart or override just one. Answers a PDF media type on
  // purpose, so a test can distinguish "fetched this endpoint" from "fetched
  // the expense one and just labelled it payment": the preview renders an
  // <object>, not an <img>.
  http.get("*/refunds/:id/payment-receipt", ({ params }) => {
    return HttpResponse.json({
      url: `https://files.example.test/payments/${params.id}.pdf?token=signed`,
      media_type: "application/pdf",
    });
  }),

  // Refund review history: registered before `*/refunds/:id` for the same
  // most-specific-first hygiene as the receipt handler above.
  http.get("*/refunds/:id/reviews", () => {
    return HttpResponse.json({
      type: "RefundReview",
      count: refundReviewsFixture.length,
      attributes: refundReviewsFixture,
    });
  }),


  // The summary must be registered BEFORE "*/refunds/:id", or the bare id handler
  // swallows "/refunds/summary" — the same ordering trap the API itself has.
  http.get("*/refunds/summary", ({ request }) => {
    const months = Number(new URL(request.url).searchParams.get("months") ?? 6);
    return HttpResponse.json({ ...refundSummaryFixture, months });
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

  // Refund stats: counts and cent sums grouped by status for a user.
  http.get("*/users/:id/refund-stats", ({ params }) => {
    return HttpResponse.json({ ...refundStatsFixture, user_id: Number(params.id) });
  }),

  // Users listing (UC-015). Honours `name`, `page` and `per_page` instead of
  // always answering the whole array: a handler that ignored the search would
  // let a debounce test pass while proving only that a list renders.
  //
  // Declared AFTER "*/users/:id/refund-stats" — MSW resolves in registration
  // order, and a bare "*/users/:id" registered first would swallow it.
  http.get("*/users", ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name")?.toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const perPage = Number(url.searchParams.get("per_page") ?? USERS_PER_PAGE);

    const filtered = name
      ? usersFixture.filter((user) => user.name.toLowerCase().includes(name))
      : usersFixture;
    const start = (page - 1) * perPage;
    const attributes = filtered.slice(start, start + perPage);

    return HttpResponse.json({
      type: "User",
      count: attributes.length,
      total: filtered.length,
      page,
      per_page: perPage,
      // 0 and not 1 for an empty set, matching the API (UC-015).
      total_pages: filtered.length ? Math.ceil(filtered.length / perPage) : 0,
      attributes,
    });
  }),

  // A single user (UC-016). 404 for an unknown id, like the API.
  http.get("*/users/:id", ({ params }) => {
    const user = usersFixture.find((candidate) => candidate.id === Number(params.id));
    if (!user) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ type: "User", count: 1, attributes: user });
  }),
];
