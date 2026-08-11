import { useQuery } from "@tanstack/react-query";
import { refundSummaryQuery } from "../api/summaryQueries";

export function useRefundSummary(months: number) {
  return useQuery(refundSummaryQuery(months));
}
