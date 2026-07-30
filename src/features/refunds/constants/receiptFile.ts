// Shared file-upload rules for refund receipts (BR-009): the expense receipt
// (RefundFormDialog, on create) and the payment receipt (PayRefundDialog, on
// mark-as-paid) accept the same extensions and size limit. The values are
// extracted here so the two schemas stay in sync on the *numbers* without
// being merged into one schema — each keeps its own `z.instanceof(FileList)`
// refinements, so loosening one validation rule never silently loosens the
// other.
export const RECEIPT_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
export const RECEIPT_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
