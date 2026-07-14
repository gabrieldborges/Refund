import { useState } from "react";
import { Link } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import Skeleton from "../components/atoms/Skeleton";
import InputText from "../components/molecules/InputText";
import ButtonIcon from "../components/molecules/ButtonIcon";
import MagnifyingGlassIcon from "../assets/icons/MagnifyingGlass.svg?react";
import CaretLeftIcon from "../assets/icons/CaretLeft.svg?react";
import CaretRightIcon from "../assets/icons/CaretRight.svg?react";
import { CATEGORIES } from "../constants/categories";
import { formatCentsToBRL } from "../lib/format";
import { useRefunds } from "../hooks/useRefunds";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

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

export default function PageHome() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isError } = useRefunds({ page, name: debouncedSearch });

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
    setPage(1);
  }

  return (
    <div className="w-full min-h-screen bg-gray-500 flex justify-center py-10 px-4">
      <div className="w-full max-w-2xl h-fit bg-white rounded-lg p-8 flex flex-col gap-6">
        <Text as="h1" variant="heading-medium">
          Solicitações
        </Text>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <InputText
              placeholder="Pesquisar pelo nome"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <ButtonIcon icon={MagnifyingGlassIcon} variant="primary" size="sm" />
        </div>

        {isError && (
          <Text variant="paragraph-medium" className="text-error text-center py-4">
            Não foi possível carregar as solicitações. Tente novamente.
          </Text>
        )}

        {isLoading && (
          <ul className="flex flex-col">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index} className="border-b border-gray-400 last:border-b-0">
                <RefundRowSkeleton />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && (
          <ul className="flex flex-col">
            {data?.attributes.length === 0 && (
              <Text variant="paragraph-medium" className="text-gray-200 py-4 text-center">
                Nenhuma solicitação encontrada.
              </Text>
            )}
            {data?.attributes.map((refund) => {
              const category = CATEGORIES[refund.category];
              return (
                <li key={refund.id} className="border-b border-gray-400 last:border-b-0">
                  <Link
                    to={`/refunds/${refund.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-gray-500 transition rounded px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <Icon svg={category.icon} className="w-6 h-6 fill-green-100" />
                      <div className="flex flex-col">
                        <Text variant="label-medium" className="text-gray-100">
                          {refund.name}
                        </Text>
                        <Text variant="paragraph-small" className="text-gray-200">
                          {category.label}
                        </Text>
                      </div>
                    </div>
                    <Text variant="paragraph-medium" className="text-gray-100">
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Text variant="paragraph-medium" className="text-gray-200">
              {data.page}/{data.total_pages}
            </Text>
            <ButtonIcon
              icon={CaretRightIcon}
              variant="primary"
              size="sm"
              disabled={data.page === data.total_pages}
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
