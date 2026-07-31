import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import { REFUND_STATUS } from "../constants/status";
import { useRefundStats } from "../hooks/useRefundStats";
import { useRefunds } from "../hooks/useRefunds";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { RefundStatus } from "../schemas/refund";

// Fixed render order for the four counters — the same four keys UC-014
// always returns, zeros included, so this never needs a data-driven length.
const STATUS_ORDER: readonly RefundStatus[] = ["pending", "approved", "paid", "rejected"];

interface RequesterPanelProps {
  requester: { id: number; name: string };
  // Who is looking at this panel (the reviewing admin), needed to compute
  // each row's destination via the shared getRefundHref rule. Not read from
  // context here — a feature component may not import `@/context` (see
  // getRefundHref.ts) — so the page passes it down.
  viewer: RefundViewer | null;
}

// The requester's context for a review: who they are, their counts by
// status (UC-014), and their own refunds (UC-004, first page only — see
// "No pagination" below). Gives the admin the history to judge one request
// against instead of in isolation.
//
// No avatar: `has_avatar` is always false today (upload doesn't exist yet),
// so a photo would render as initials for everyone — deferred to the
// profile-picture cycle.
export default function RequesterPanel({ requester, viewer }: RequesterPanelProps) {
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useRefundStats(requester.id);
  const {
    data: list,
    isLoading: isListLoading,
    isError: isListError,
  } = useRefunds({ page: 1, perPage: REFUNDS_PER_PAGE, userId: requester.id });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{requester.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isStatsLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_ORDER.map((status) => (
              <Skeleton key={status} className="h-16 w-full" />
            ))}
          </div>
        )}

        {/* A failed stats request must not fall through to a rendered zero —
            that would be indistinguishable from a requester who genuinely
            has nothing in every status (the same gap Task 2 fixed on the
            Home). */}
        {isStatsError && !isStatsLoading && (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar as estatísticas do solicitante.
          </p>
        )}

        {stats && !isStatsLoading && !isStatsError && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex flex-col gap-1 rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">{REFUND_STATUS[status].label}</span>
                <span className="text-lg font-semibold">{stats.by_status[status].count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Solicitações</h3>

          {isListLoading && (
            <ul className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </ul>
          )}

          {/* Same reasoning as the stats error above: silence here would be
              indistinguishable from a requester with no refunds at all. */}
          {isListError && !isListLoading && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar as solicitações do solicitante.
            </p>
          )}

          {list && !isListLoading && !isListError && (
            <>
              <ul className="flex flex-col overflow-hidden rounded-lg border">
                {list.attributes.length === 0 && (
                  <li className="py-3 text-center text-sm text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </li>
                )}
                {list.attributes.map((refund) => (
                  <li key={refund.id} className="border-b last:border-b-0">
                    <Link
                      to={getRefundHref(refund, viewer)}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/50"
                    >
                      <span className="truncate">{refund.name}</span>
                      <Badge variant={REFUND_STATUS[refund.status].variant}>
                        {REFUND_STATUS[refund.status].label}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* No pagination here on purpose (see file header) — the Home
                  already paginates, so point there instead of reimplementing
                  it. Reuses the Home's existing `name` search (there is no
                  `user_id` filter in its UI) rather than adding one. */}
              <Link
                to={`/?name=${encodeURIComponent(requester.name)}`}
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                Ver todas as solicitações de {requester.name} na Home
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
