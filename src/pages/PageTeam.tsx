import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { UsersTable, useUsers } from "@/features/team";
import type { teamLoader } from "../router-loaders";

interface TeamSearchProps {
  initialSearch: string;
  updateListLocation: (nextName: string, nextPage: number, replace?: boolean) => void;
}

// Mesma forma do RefundSearch da Home: estado local para a digitação ser
// imediata, valor debounced escrito na URL com replace, e submit no Enter sem
// replace. A URL é a fonte de verdade — o loader roda a partir dela.
function TeamSearch({ initialSearch, updateListLocation }: TeamSearchProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch.trim() !== initialSearch) {
      // replace: true para uma busca digitada não deixar um item de histórico
      // por tecla.
      updateListLocation(debouncedSearch, 1, true);
    }
  }, [debouncedSearch, initialSearch, updateListLocation]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateListLocation(search, 1);
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-sm">
      <Label htmlFor="team-search" className="sr-only">
        {t("team.searchLabel")}
      </Label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id="team-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("team.searchPlaceholder")}
        className="pl-9"
      />
    </form>
  );
}

export default function PageTeam() {
  const { t } = useTranslation();
  const { page, name } = useLoaderData<typeof teamLoader>();
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const { data, isLoading, isError } = useUsers({ page, name });

  const updateListLocation = useCallback(
    (nextName: string, nextPage: number, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const trimmed = nextName.trim();
          if (trimmed) next.set("name", trimmed);
          else next.delete("name");
          if (nextPage > 1) next.set("page", String(nextPage));
          else next.delete("page");
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  // Qual seta gira: comparar o `page` do destino com o atual, para uma navegação
  // de busca não acender nenhuma das duas.
  const pendingPage = navigation.location
    ? Number(new URLSearchParams(navigation.location.search).get("page") ?? 1)
    : null;
  const isLoadingPreviousPage = pendingPage !== null && pendingPage < page;
  const isLoadingNextPage = pendingPage !== null && pendingPage > page;

  return (
    <div className="flex flex-col gap-4 p-4">
      <TeamSearch key={name ?? ""} initialSearch={name ?? ""} updateListLocation={updateListLocation} />

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* Erro nunca cai em "lista vazia renderizada": uma tabela vazia por falha
          de rede seria indistinguível de uma busca sem resultado. */}
      {isError && (
        <p role="alert" className="py-4 text-center text-sm text-destructive">
          {t("team.loadError")}
        </p>
      )}

      {!isLoading && !isError && <UsersTable users={data?.attributes ?? []} />}

      {data && data.total_pages > 0 && (
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("team.previousPage")}
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
            {t("team.pageStatus", { page: data.page, total: data.total_pages })}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("team.nextPage")}
            aria-busy={isLoadingNextPage}
            disabled={data.page === data.total_pages || navigation.state !== "idle"}
            onClick={() =>
              updateListLocation(name ?? "", Math.min(data.total_pages, data.page + 1))
            }
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
