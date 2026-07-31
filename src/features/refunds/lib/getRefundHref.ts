// Minimal shape of the logged-in viewer this rule needs. Deliberately NOT the
// AuthUser type from `@/context/auth-context`: the eslint boundaries config
// (eslint.config.js) classifies `src/context` as "app" layer, and a feature
// may only depend on `ui`/`shared` (plus its own internals) — never `app`.
// AuthUser structurally satisfies this shape, so callers pass it as-is.
export interface RefundViewer {
  id: number;
  role: "standard" | "admin";
}

// BR-016: an admin may review any refund except their own. This is the SINGLE
// implementation of that condition — every caller that needs the rule (not
// just a route) must call `canReviewRefund` instead of re-expressing it, or
// a future clause added here (e.g. "not a refund the admin already rejected")
// would silently miss whichever caller still carries its own copy.
export function canReviewRefund(
  refund: { user: { id: number } },
  viewer: RefundViewer | null
): boolean {
  return viewer?.role === "admin" && refund.user.id !== viewer.id;
}

// One caller of `canReviewRefund`: picks the route for a refund row. The
// Home's list rows and the review screen's RequesterPanel (Task 9) share this
// so the two never carry two copies of the routing decision.
export function getRefundHref(
  refund: { id: number; user: { id: number } },
  viewer: RefundViewer | null
): string {
  return canReviewRefund(refund, viewer)
    ? `/refunds/${refund.id}/review`
    : `/refunds/${refund.id}`;
}
