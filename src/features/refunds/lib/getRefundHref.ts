// Minimal shape of the logged-in viewer this rule needs. Deliberately NOT the
// AuthUser type from `@/context/auth-context`: the eslint boundaries config
// (eslint.config.js) classifies `src/context` as "app" layer, and a feature
// may only depend on `ui`/`shared` (plus its own internals) — never `app`.
// AuthUser structurally satisfies this shape, so callers pass it as-is.
export interface RefundViewer {
  id: number;
  role: "standard" | "admin";
}

// BR-016: an admin may review any refund except their own. Extracted so the
// Home's list rows and the review screen's RequesterPanel (Task 9) share ONE
// implementation of this condition instead of two copies that could drift —
// a second copy is exactly how they would.
export function getRefundHref(
  refund: { id: number; user: { id: number } },
  viewer: RefundViewer | null
): string {
  const canReview = viewer?.role === "admin" && refund.user.id !== viewer.id;
  return canReview ? `/refunds/${refund.id}/review` : `/refunds/${refund.id}`;
}
