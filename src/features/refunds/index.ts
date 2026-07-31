// Public API (façade) of the refunds feature. The rest of the app must import
// from "features/refunds", never from an internal path like
// "features/refunds/hooks/useRefund". Item 9 will turn this convention into an
// ESLint rule. Internal details (refundKeys, response schemas, CATEGORY_VALUES)
// are intentionally NOT re-exported here.

// Data-access layer: query options reused by the router loaders.
export { refundListQuery, refundDetailQuery } from "./api/refundQueries";
export { refundStatsQuery } from "./api/reviewQueries";

// Hooks: the feature's data API for pages.
export { useRefunds } from "./hooks/useRefunds";
export { useRefund } from "./hooks/useRefund";
export { useCreateRefund } from "./hooks/useCreateRefund";
export { useDeleteRefund } from "./hooks/useDeleteRefund";
export { useRefundStats } from "./hooks/useRefundStats";
export { useReviewRefund } from "./hooks/useReviewRefund";
export { usePayRefund } from "./hooks/usePayRefund";
export { useRefundReviews } from "./hooks/useRefundReviews";

// URL search-params schema used by the home loader.
export { refundListSearchParamsSchema } from "./schemas/refund";

// Domain constants consumed by pages.
export { CATEGORIES, CATEGORY_OPTIONS } from "./constants/categories";
export { REFUNDS_PER_PAGE } from "./constants/pagination";
export { REFUND_STATUS } from "./constants/status";

// Feature component mounted by the app shell (MainLayout).
export { default as RefundFormDialog } from "./components/RefundFormDialog";

// Receipt preview: renders a receipt Blob inline with a fullscreen dialog.
// The `kind` prop picks expense (UC-010) vs payment (UC-012) receipt.
export { default as ReceiptPreview } from "./components/ReceiptPreview";

// Review decision controls: approve/reject buttons and the reject-reason dialog.
export { default as ReviewDecision } from "./components/ReviewDecision";

// Mark-as-paid dialog: uploads the mandatory payment receipt (UC-012).
export { default as PayRefundDialog } from "./components/PayRefundDialog";

// Review history timeline: the closed loop for a rejection's reason (UC-013).
export { default as ReviewTimeline } from "./components/ReviewTimeline";
