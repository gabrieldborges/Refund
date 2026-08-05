import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { REFUND_STATUS } from "../constants/status";
import { useRefundReviews } from "../hooks/useRefundReviews";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEnteredItems } from "@/hooks/useEnteredItems";

interface ReviewTimelineProps {
  refundId: string;
}

// The decision history behind a refund's status — what closes the loop that
// used to leave a rejection's reason write-only (UC-013). An undecided
// refund (still pending, nobody has reviewed it) gets a 200 with an empty
// list from the API; that is the normal absence of history, not an error, so
// this component renders nothing at all for it — no heading, no empty box.
// A review has no id in the contract (UC-013), so identity is composed from
// the fields that make a decision unique.
function reviewId(review: { created_at: string; from_status: string; to_status: string }) {
  return `${review.created_at}-${review.from_status}-${review.to_status}`;
}

export default function ReviewTimeline({ refundId }: ReviewTimelineProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRefundReviews(refundId);

  // Called BEFORE the early returns below. Hooks must run unconditionally, and
  // the loading/error/empty branches all return early — putting this after them
  // made the hook count change between renders, which React rejects outright.
  // Same identity used as the React key, so "is this entering?" and "is this
  // the same element?" can never disagree.
  const entering = useEnteredItems(
    (data?.attributes ?? []).map(reviewId)
  );

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

  const reviews = data.attributes.toReversed();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t("review.history")}</h3>
      {/* Shown most recent to oldest. This is PRESENTATION order: the data
          layer (api/reviewQueries.ts) still hands back exactly what the API
          sent, with no reordering by field, and `toReversed` does not
          mutate the array cached by React Query. */}
      <ol className="flex flex-col gap-3">
        {reviews.map((review) => {
          const id = reviewId(review);
          return (
            <li
              key={id}
              // The grid wrapper is what lets the entrance push the items below
              // it downwards instead of appearing on top of them: the animation
              // opens grid-template-rows from 0fr, so the row grows into place
              // and everything after it is displaced by layout, not by a
              // transform that would overlap.
              className={cn("timeline-item", entering.has(id) && "timeline-item--entering")}
            >
              <div className="flex flex-col gap-1 border-l-2 border-muted pl-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={REFUND_STATUS[review.to_status].variant}>
                    {t(REFUND_STATUS[review.to_status].labelKey)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{review.reviewer.name}</p>
                {/* null for approvals and payments — only rejections carry a reason (BR-018). */}
                {review.reason && <p className="text-sm">{review.reason}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
