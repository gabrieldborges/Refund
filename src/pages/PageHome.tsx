import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, REFUND_STATUS, useRefunds, useRefundStats } from "@/features/refunds";
import { formatCentsToBRL } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/context/useAuth";
import type { homeLoader } from "@/router-loaders";

function RefundRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 px-2 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

interface RefundSearchProps {
  initialSearch: string;
  updateListLocation: (nextName: string, nextPage: number, replace?: boolean) => void;
}

function RefundSearch({ initialSearch, updateListLocation }: RefundSearchProps) {
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
          placeholder="Pesquisar pelo nome"
          aria-label="Pesquisar pelo nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>
    </form>
  );
}

export default function PageHome() {
  const { page, perPage, name } = useLoaderData<typeof homeLoader>();
  const [, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data, isLoading, isError } = useRefunds({ page, perPage, name });
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitações</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} ${data.total === 1 ? "solicitação" : "solicitações"}` : " "}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Solicitações
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
              {isAdmin ? "Solicitado" : "Aprovado + pago"}
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
                <p className="text-2xl font-semibold">{stats?.by_status.pending.count ?? 0}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <RefundSearch key={name ?? ""} initialSearch={name ?? ""} updateListLocation={updateListLocation} />

      {isError && (
        <p role="alert" className="py-4 text-center text-sm text-destructive">
          Não foi possível carregar as solicitações. Tente novamente.
        </p>
      )}

      {isLoading && (
        <ul className="flex flex-col rounded-xl border">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="border-b last:border-b-0">
              <RefundRowSkeleton />
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && (
        <ul className="flex flex-col rounded-xl border overflow-hidden">
          {data?.attributes.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma solicitação encontrada.
            </li>
          )}
          {data?.attributes.map((refund) => {
            const category = CATEGORIES[refund.category];
            const CategoryIcon = category.icon;
            return (
              <li key={refund.id} className="border-b last:border-b-0">
                <Link
                  to={`/refunds/${refund.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-accent/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{refund.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{category.label}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={REFUND_STATUS[refund.status].variant}>
                      {REFUND_STATUS[refund.status].label}
                    </Badge>
                    <span className="text-sm">{formatCentsToBRL(refund.amount_in_cents)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.total_pages > 0 && (
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={data.page === 1}
            onClick={() => updateListLocation(name ?? "", Math.max(1, data.page - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {data.page} de {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima página"
            disabled={data.page === data.total_pages}
            onClick={() => updateListLocation(name ?? "", Math.min(data.total_pages, data.page + 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
