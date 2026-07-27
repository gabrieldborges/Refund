import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, useRefunds } from "@/features/refunds";
import { formatCentsToBRL } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

  const { data, isLoading, isError } = useRefunds({ page, perPage, name });

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

      <div className="grid gap-4 sm:grid-cols-2">
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
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-semibold">
                {formatCentsToBRL(data?.sum_amount_in_cents ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
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
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="size-5 text-muted-foreground" aria-hidden />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{refund.name}</span>
                      <span className="text-xs text-muted-foreground">{category.label}</span>
                    </div>
                  </div>
                  <span className="text-sm">{formatCentsToBRL(refund.amount_in_cents)}</span>
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
