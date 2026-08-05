import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import { REFUND_STATUS } from "../constants/status";
import { useRefundStats } from "../hooks/useRefundStats";
import { useRefunds } from "../hooks/useRefunds";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { Refund, RefundStatus } from "../schemas/refund";
import { useTranslation } from "react-i18next";

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
  // Qual linha desta lista é a solicitação aberta agora. Também é a âncora
  // das setas de navegação (Task 11).
  currentRefundId: number;
}

// Uma seta: link quando há vizinho, botão desabilitado quando não há. Os dois
// estados precisam ocupar o mesmo espaço — uma seta que some desloca a outra.
function NavigationArrow({
  refund,
  viewer,
  label,
  children,
}: {
  refund: Refund | null;
  viewer: RefundViewer | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!refund) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" aria-label={label} asChild>
      <Link to={getRefundHref(refund, viewer)}>{children}</Link>
    </Button>
  );
}

// The requester's context for a review: who they are, their counts by
// status (UC-014), and their own refunds (UC-004, first page only — see
// "No pagination" below). Gives the admin the history to judge one request
// against instead of in isolation.
//
// No avatar: `has_avatar` is always false today (upload doesn't exist yet),
// so a photo would render as initials for everyone — deferred to the
// profile-picture cycle.
export default function RequesterPanel({ requester, viewer, currentRefundId }: RequesterPanelProps) {
  const { t } = useTranslation();
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useRefundStats(requester.id);
  const {
    data: list,
    isLoading: isListLoading,
    isError: isListError,
  } = useRefunds({ page: 1, perPage: REFUNDS_PER_PAGE, userId: requester.id });

  // Posição derivada da lista já carregada — sem estado novo. -1 significa que
  // a solicitação aberta não está nesta página (o painel carrega só a
  // primeira, por decisão do ciclo anterior); nesse caso não há vizinho em
  // nenhuma direção.
  const rows = list?.attributes ?? [];
  const currentIndex = rows.findIndex((refund) => refund.id === currentRefundId);
  const previousRefund = currentIndex > 0 ? rows[currentIndex - 1] : null;
  const nextRefund =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? rows[currentIndex + 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{requester.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isStatsLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Skeleton className="h-16 w-full" />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {/* Contagem, não valor: somar dinheiro dos quatro status juntaria
                previsão, passivo, despesa liquidada e nada — é o que o
                comentário de refundStatsResponseSchema registra, e ele já
                prevê esta soma de CONTAGENS no cliente. */}
            <div className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">{t("common.total")}</span>
              <span className="text-xl font-semibold">
                {STATUS_ORDER.reduce((sum, status) => sum + stats.by_status[status].count, 0)}
              </span>
            </div>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex flex-col gap-1 rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">{t(REFUND_STATUS[status].labelKey)}</span>
                <span className="text-lg font-semibold">{stats.by_status[status].count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Solicitações</h3>
            <div className="flex items-center gap-1">
              <NavigationArrow
                refund={previousRefund}
                viewer={viewer}
                label={t("review.previousRequest")}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </NavigationArrow>
              <NavigationArrow
                refund={nextRefund}
                viewer={viewer}
                label={t("review.nextRequest")}
              >
                <ChevronRight className="size-4" aria-hidden />
              </NavigationArrow>
            </div>
          </div>

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
                {list.attributes.map((refund) => {
                  const isCurrent = refund.id === currentRefundId;
                  return (
                    <li key={refund.id} className="border-b last:border-b-0">
                      <Link
                        to={getRefundHref(refund, viewer)}
                        // Cor sozinha não é sinal acessível; aria-current é o
                        // que um leitor de tela anuncia.
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/50",
                          isCurrent && "bg-accent font-medium"
                        )}
                      >
                        <span className="truncate">{refund.name}</span>
                        <Badge variant={REFUND_STATUS[refund.status].variant}>
                          {t(REFUND_STATUS[refund.status].labelKey)}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
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
