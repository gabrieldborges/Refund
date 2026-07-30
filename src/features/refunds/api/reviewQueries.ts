import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundStatsResponseSchema } from "../schemas/refund";
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
