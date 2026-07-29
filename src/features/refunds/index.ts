// Public API (façade) of the refunds feature. The rest of the app must import
// from "features/refunds", never from an internal path like
// "features/refunds/hooks/useRefund". Item 9 will turn this convention into an
// ESLint rule. Internal details (refundKeys, response schemas, CATEGORY_VALUES)
// are intentionally NOT re-exported here.

// Data-access layer: query options reused by the router loaders.
export { refundListQuery, refundDetailQuery } from "./api/refundQueries";

// Hooks: the feature's data API for pages.
export { useRefunds } from "./hooks/useRefunds";
export { useRefund } from "./hooks/useRefund";
export { useCreateRefund } from "./hooks/useCreateRefund";
export { useDeleteRefund } from "./hooks/useDeleteRefund";

// URL search-params schema used by the home loader.
export { refundListSearchParamsSchema } from "./schemas/refund";

// Domain constants consumed by pages.
export { CATEGORIES, CATEGORY_OPTIONS } from "./constants/categories";
export { REFUNDS_PER_PAGE } from "./constants/pagination";

// Feature component mounted by the app shell (MainLayout).
export { default as RefundFormDialog } from "./components/RefundFormDialog";

// Receipt preview: renders the receipt Blob inline with a fullscreen dialog.
export { default as ReceiptPreview } from "./components/ReceiptPreview";
