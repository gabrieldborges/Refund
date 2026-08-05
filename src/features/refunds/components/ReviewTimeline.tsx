import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { REFUND_STATUS } from "../constants/status";
import { useRefundReviews } from "../hooks/useRefundReviews";
import { useTranslation } from "react-i18next";

interface ReviewTimelineProps {
  refundId: string;
}

// The decision history behind a refund's status — what closes the loop that
// used to leave a rejection's reason write-only (UC-013). An undecided
// refund (still pending, nobody has reviewed it) gets a 200 with an empty
// list from the API; that is the normal absence of history, not an error, so
// this component renders nothing at all for it — no heading, no empty box.
export default function ReviewTimeline({ refundId }: ReviewTimelineProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRefundReviews(refundId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Deliberately distinguishable from the empty-history branch below: a
  // component that silently renders nothing on error would be indistinguishable
  // from a refund nobody has reviewed yet — exactly the ambiguity this
  // feature exists to remove.
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar o histórico da solicitação.
      </p>
    );
  }

  if (!data || data.attributes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Histórico</h3>
      {/* Shown most recent to oldest. This is PRESENTATION order: the data
          layer (api/reviewQueries.ts) still hands back exactly what the API
          sent, with no reordering by field, and `toReversed` does not
          mutate the array cached by React Query. */}
      <ol className="flex flex-col gap-3">
        {data.attributes.toReversed().map((review) => (
          <li
            key={`${review.created_at}-${review.from_status}-${review.to_status}`}
            className="flex flex-col gap-1 border-l-2 border-muted pl-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant={REFUND_STATUS[review.to_status].variant}>
                {t(REFUND_STATUS[review.to_status].labelKey)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{review.reviewer.name}</p>
            {/* null for approvals and payments — only rejections carry a reason (BR-018). */}
            {review.reason && <p className="text-sm">{review.reason}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
