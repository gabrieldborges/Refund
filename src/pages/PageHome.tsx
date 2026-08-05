import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefundsTable,
  RefundsToolbar,
  useRefunds,
  useRefundStats,
  usePendingCount,
  type RefundOrder,
  type RefundSort,
  type RefundStatus,
  REFUND_STATUS,
} from "@/features/refunds";
import { formatCentsToBRL } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/context/useAuth";
import type { homeLoader } from "@/router-loaders";
import { useTranslation } from "react-i18next";

// Coluna nova começa na direção que faz sentido para o tipo do dado; a mesma
// coluna clicada de novo inverte. Tabela de lookup em vez de ternários
// encadeados, como REFUND_STATUS e RECEIPT_COPY.
const DEFAULT_ORDER_BY_COLUMN: Record<RefundSort, RefundOrder> = {
  name: "asc",
  status: "asc",
  created_at: "desc",
  amount_in_cents: "desc",
};

interface RefundSearchProps {
  initialSearch: string;
  updateListLocation: (nextName: string, nextPage: number, replace?: boolean) => void;
}

function RefundSearch({ initialSearch, updateListLocation }: RefundSearchProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch.trim() !== initialSearch) {
      updateListLocation(debouncedSearch, 1, true);
    }
  }, [debouncedSearch, initialSearch, updateListLocation]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateListLocation(search, 1);
  }

  return (
    <form onSubmit={handleSearchSubmit}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder={t("home.searchByName")}
          aria-label={t("home.searchByName")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>
    </form>
  );
}

export default function PageHome() {
  const { t } = useTranslation();
  const { page, perPage, name, status, sort, order } = useLoaderData<typeof homeLoader>();
  const [, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data, isLoading, isError } = useRefunds({ page, perPage, name, status, sort, order });
  // An admin's Home lists everyone's refunds, but GET /users/{id}/refund-stats
  // is per-user (see UC-014) — there is no endpoint for a global per-status
  // aggregate. An admin's money card therefore doesn't need this query at all
  // (it reads the list's own sum_amount_in_cents below); only a standard user,
  // reading their own stats, does.
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useRefundStats(isAdmin ? undefined : user?.id);
  // Status is a dimension, not an optional filter: pending is a forecast,
  // approved is a liability still owed, paid is a realised expense, and
  // rejected is nothing. A figure spanning all four is meaningless, so the
  // money card sums only the two statuses that represent money actually
  // committed — labelled accordingly so the label carries the meaning.
  const approvedAndPaidCents =
    (stats?.by_status.approved.amount_in_cents ?? 0) + (stats?.by_status.paid.amount_in_cents ?? 0);

  // The admin's pending count is global by definition — it answers "what
  // needs my attention", so it must not follow the list's status filter,
  // name search or page. It comes from a dedicated one-row query
  // (usePendingCount), never from `data.total` above. A standard user's own
  // count already comes from refund-stats, so the request is disabled here.
  const {
    count: pendingCount,
    isLoading: isPendingLoading,
    isError: isPendingError,
  } = usePendingCount(isAdmin);

  // Trocar de página é uma navegação do router, não uma mutation: o clique
  // reescreve os search params e o loader da rota rebusca. Então quem sabe se
  // ainda está carregando é o router, não o React Query.
  //
  // `navigation.location` é o destino da transição em curso. Ler a página
  // pedida dali, em vez de olhar só `navigation.state`, resolve duas coisas de
  // uma vez: diz QUAL seta gira (comparando com a página atual), e faz com que
  // uma navegação que não muda de página — a busca com debounce, por exemplo —
  // não acenda nenhuma das duas. Essa segunda parte é a armadilha que a
  // revisão da branch anterior encontrou no diálogo de nova solicitação, onde
  // um `navigation.state !== "idle"` global fazia o botão anunciar um envio
  // que não existia.
  //
  // O loader remove `page=1` da URL por ser o padrão, então parâmetro ausente
  // significa página 1.
  //
  // A comparação é contra `page` (do loader), NÃO contra `data.page` (da
  // resposta da API). Os dois coincidem quando tudo funciona, mas só o
  // primeiro é derivado da URL dos dois lados — `data` pode estar servindo a
  // página anterior durante a transição, ou vir de um cache. Um teste pegou
  // isso: com um fixture que devolve `page: 1` fixo, comparar contra a
  // resposta acendia a seta numa navegação que nem mudava de página.
  const navigation = useNavigation();
  const pendingPage = navigation.location
    ? Number(new URLSearchParams(navigation.location.search).get("page") ?? 1)
    : null;
  const isLoadingPreviousPage = pendingPage !== null && pendingPage < page;
  const isLoadingNextPage = pendingPage !== null && pendingPage > page;

  const updateListLocation = useCallback(
    (nextName: string, nextPage: number, replace = false) => {
      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          const normalizedName = nextName.trim();

          if (normalizedName) {
            nextParams.set("name", normalizedName);
          } else {
            nextParams.delete("name");
          }

          if (nextPage > 1) {
            nextParams.set("page", String(nextPage));
          } else {
            nextParams.delete("page");
          }

          return nextParams;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const handleSortChange = useCallback(
    (column: RefundSort) => {
      const nextOrder: RefundOrder =
        column === sort ? (order === "asc" ? "desc" : "asc") : DEFAULT_ORDER_BY_COLUMN[column];

      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        // Ordenar reinicia a paginação: a página 3 de uma ordem é um conjunto
        // sem relação com a página 3 da outra.
        nextParams.delete("page");

        if (column === "created_at") nextParams.delete("sort");
        else nextParams.set("sort", column);

        if (nextOrder === "desc") nextParams.delete("order");
        else nextParams.set("order", nextOrder);

        return nextParams;
      });
    },
    [order, setSearchParams, sort]
  );

  const handleStatusChange = useCallback(
    (nextStatus: RefundStatus | undefined) => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        // Trocar o filtro reinicia a paginação: a página 3 do conjunto antigo
        // pode nem existir no novo. É a mesma regra da busca por nome.
        nextParams.delete("page");

        if (nextStatus) nextParams.set("status", nextStatus);
        else nextParams.delete("status");

        return nextParams;
      });
    },
    [setSearchParams]
  );

  // O `total` da listagem vem estreitado por status E por busca de nome
  // (UC-004) — nomear só o status deixava a busca de fora do rótulo, então um
  // número filtrado pelos dois aparecia como se só o status explicasse o
  // recorte. Repetir o termo buscado deixaria o card poluído, então "busca"
  // apenas sinaliza que esse filtro também está ativo, no mesmo formato que
  // t(REFUND_STATUS[status].labelKey) já usa para o status.
  const requestsCardLabel = (() => {
    const activeFilters = [
      status && t(REFUND_STATUS[status].labelKey),
      name && t("home.searchFilter"),
    ].filter(Boolean);
    return activeFilters.length > 0
      ? t("home.requestsFiltered", { filters: activeFilters.join(", ") })
      : t("home.requests");
  })();

  // Com filtro ativo, `sum_amount_in_cents` cobre só aquele status (UC-004).
  // O rótulo segue o número; um número certo com nome errado é pior que
  // nenhum dos dois.
  const moneyCardLabel = isAdmin
    ? status
      ? t(REFUND_STATUS[status].labelKey)
      : t("home.requested")
    : t("home.approvedAndPaid");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("home.requests")}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? t("home.requestCount", { count: data.total }) : " "}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {requestsCardLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {moneyCardLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin ? isLoading : isStatsLoading) ? (
              <Skeleton className="h-8 w-28" />
            ) : !isAdmin && isStatsError ? (
              // A failed stats request must not silently render as R$ 0,00 —
              // that would be indistinguishable from a user who genuinely has
              // nothing approved or paid. Same idiom as the list's own error
              // banner below (role="alert", destructive text).
              <p role="alert" className="text-sm text-destructive">
                Não foi possível carregar.
              </p>
            ) : (
              <p className="text-2xl font-semibold">
                {formatCentsToBRL(isAdmin ? (data?.sum_amount_in_cents ?? 0) : approvedAndPaidCents)}
              </p>
            )}
          </CardContent>
        </Card>

        {!isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : isStatsError ? (
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível carregar.
                </p>
              ) : (
                <>
                  <p className="text-2xl font-semibold">{stats?.by_status.pending.count ?? 0}</p>
                  {status && <p className="text-xs text-muted-foreground">{t("home.allNoFilter")}</p>}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPendingLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : isPendingError ? (
                // Same idiom as the standard user's card above: a failed
                // request must not fall through to "0", which would read as
                // "nothing is pending" instead of "we don't know".
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível carregar.
                </p>
              ) : (
                <>
                  <p className="text-2xl font-semibold">{pendingCount ?? 0}</p>
                  {status && <p className="text-xs text-muted-foreground">{t("home.allNoFilter")}</p>}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <RefundSearch
            key={name ?? ""}
            initialSearch={name ?? ""}
            updateListLocation={updateListLocation}
          />
        </div>
        <RefundsToolbar status={status} onStatusChange={handleStatusChange} />
      </div>

      {isError && (
        <p role="alert" className="py-4 text-center text-sm text-destructive">
          Não foi possível carregar as solicitações. Tente novamente.
        </p>
      )}

      {!isError && (
        <RefundsTable
          refunds={data?.attributes ?? []}
          viewer={user}
          isLoading={isLoading}
          sort={sort}
          order={order}
          onSortChange={handleSortChange}
        />
      )}

      {data && data.total_pages > 0 && (
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("home.previousPage")}
            aria-busy={isLoadingPreviousPage}
            disabled={data.page === 1 || navigation.state !== "idle"}
            onClick={() => updateListLocation(name ?? "", Math.max(1, data.page - 1))}
          >
            {isLoadingPreviousPage ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {data.page} de {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("home.nextPage")}
            aria-busy={isLoadingNextPage}
            disabled={data.page === data.total_pages || navigation.state !== "idle"}
            onClick={() => updateListLocation(name ?? "", Math.min(data.total_pages, data.page + 1))}
          >
            {isLoadingNextPage ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
