import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";

// How many refunds are pending IN TOTAL — never the current page, never the
// active filter. Requests a one-row page and reads only `total`, which the
// API computes over the whole set (UC-004); the body comes back almost
// empty.
//
// Only the admin needs this. A standard user already gets their own count
// from GET /users/{id}/refund-stats, which, being per-user, already ignores
// filter and pagination — hence the `enabled`.
export function usePendingCount(enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    ...refundListQuery({ page: 1, perPage: 1, status: "pending" }),
    enabled,
  });

  return { count: data?.total, isLoading: enabled && isLoading, isError };
}
