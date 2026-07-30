import { useQuery } from "@tanstack/react-query";
import { refundStatsQuery } from "../api/reviewQueries";

// userId is undefined while the session is still resolving, or for an admin
// whose Home screen doesn't need per-status stats (it shows the list's own
// sum instead). Disabled in that case so the "0" placeholder key never
// actually fires a request.
export function useRefundStats(userId: number | undefined) {
  return useQuery({
    ...refundStatsQuery(userId ?? 0),
    enabled: !!userId,
  });
}
