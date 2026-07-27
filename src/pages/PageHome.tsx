import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import Skeleton from "../components/atoms/Skeleton";
import InputText from "../components/molecules/InputText";
import ButtonIcon from "../components/molecules/ButtonIcon";
import MagnifyingGlassIcon from "../assets/icons/MagnifyingGlass.svg?react";
import CaretLeftIcon from "../assets/icons/CaretLeft.svg?react";
import CaretRightIcon from "../assets/icons/CaretRight.svg?react";
import { CATEGORIES, useRefunds } from "@/features/refunds";
import { formatCentsToBRL } from "../lib/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { homeLoader } from "../router-loaders";

function RefundRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-2">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" className="w-6 h-6" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
      <Skeleton className="w-14 h-4" />
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
    <form className="flex items-end gap-3" onSubmit={handleSearchSubmit}>
      <div className="flex-1">
        <InputText
          placeholder="Pesquisar pelo nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ButtonIcon
        type="submit"
        icon={MagnifyingGlassIcon}
        variant="primary"
        size="sm"
        aria-label="Pesquisar"
      />
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
    <div className="w-full min-h-screen bg-app flex justify-center py-10 px-4">
      <div className="w-full max-w-2xl h-fit bg-surface rounded-lg p-8 flex flex-col gap-6">
        <Text as="h1" variant="heading-medium">
          Solicitações
        </Text>

        <RefundSearch
          key={name ?? ""}
          initialSearch={name ?? ""}
          updateListLocation={updateListLocation}
        />

        {isError && (
          <Text variant="paragraph-medium" className="text-error text-center py-4">
            Não foi possível carregar as solicitações. Tente novamente.
          </Text>
        )}

        {isLoading && (
          <ul className="flex flex-col">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="border-b border-subtle last:border-b-0">
                <RefundRowSkeleton />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && (
          <ul className="flex flex-col">
            {data?.attributes.length === 0 && (
              <Text variant="paragraph-medium" className="text-muted py-4 text-center">
                Nenhuma solicitação encontrada.
              </Text>
            )}
            {data?.attributes.map((refund) => {
              const category = CATEGORIES[refund.category];
              return (
                <li key={refund.id} className="border-b border-subtle last:border-b-0">
                  <Link
                    to={`/refunds/${refund.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-app transition rounded px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <Icon svg={category.icon} className="w-6 h-6 fill-accent" />
                      <div className="flex flex-col">
                        <Text variant="label-medium" className="text-content">
                          {refund.name}
                        </Text>
                        <Text variant="paragraph-small" className="text-muted">
                          {category.label}
                        </Text>
                      </div>
                    </div>
                    <Text variant="paragraph-medium" className="text-content">
                      {formatCentsToBRL(refund.amount_in_cents)}
                    </Text>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {data && data.total_pages > 0 && (
          <div className="flex items-center justify-center gap-4">
            <ButtonIcon
              icon={CaretLeftIcon}
              variant="primary"
              size="sm"
              disabled={data.page === 1}
              onClick={() => updateListLocation(name ?? "", Math.max(1, data.page - 1))}
            />
            <Text variant="paragraph-medium" className="text-muted">
              {data.page}/{data.total_pages}
            </Text>
            <ButtonIcon
              icon={CaretRightIcon}
              variant="primary"
              size="sm"
              disabled={data.page === data.total_pages}
              onClick={() =>
                updateListLocation(name ?? "", Math.min(data.total_pages, data.page + 1))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
