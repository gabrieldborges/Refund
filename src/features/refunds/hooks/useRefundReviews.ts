import { useQuery } from "@tanstack/react-query";
import { refundReviewsQuery } from "../api/reviewQueries";

// Same "no id yet" guard as useRefund/useReceipt: without an id (route still
// resolving), the query stays disabled instead of firing against "".
export function useRefundReviews(id: string | undefined) {
  return useQuery({
    ...refundReviewsQuery(id ?? ""),
    enabled: !!id,
  });
}
