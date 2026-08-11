import { useQuery } from "@tanstack/react-query";
import { refundSummaryQuery } from "../api/summaryQueries";

export function useRefundSummary(year: number | undefined) {
  return useQuery(refundSummaryQuery(year));
}
