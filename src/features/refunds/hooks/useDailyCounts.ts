import { useQuery } from "@tanstack/react-query";
import { refundDailyCountsQuery } from "../api/dailyCountsQueries";

export function useDailyCounts(month: string) {
  return useQuery(refundDailyCountsQuery(month));
}
