import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundReviewsResponseSchema, refundStatsResponseSchema } from "../schemas/refund";
import { refundKeys } from "./refundQueries";

// Counts and cent sums grouped by status for one user (GET /users/{id}/refund-stats).
// A standard user reads their own id; an admin may read anyone's — see UC-014.
export function refundStatsQuery(userId: number) {
  return queryOptions({
    queryKey: refundKeys.stats(userId),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>(`/users/${userId}/refund-stats`, { signal });
      return refundStatsResponseSchema.parse(data);
    },
  });
}

// A refund's full decision history (GET /refunds/{id}/reviews — UC-013).
// The API returns entries ordered chronologically (oldest first, id as
// tie-breaker); this layer parses and returns them as-is, so the caller must
// render them in the order received rather than re-sorting. An undecided
// refund returns a 200 with an empty list, not an error.
export function refundReviewsQuery(id: string) {
  return queryOptions({
    queryKey: refundKeys.reviews(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>(`/refunds/${id}/reviews`, { signal });
      return refundReviewsResponseSchema.parse(data);
    },
  });
}
