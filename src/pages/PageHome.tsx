import { useMemo, useState } from "react";
import { Link } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import InputText from "../components/molecules/InputText";
import ButtonIcon from "../components/molecules/ButtonIcon";
import MagnifyingGlassIcon from "../assets/icons/MagnifyingGlass.svg?react";
import CaretLeftIcon from "../assets/icons/CaretLeft.svg?react";
import CaretRightIcon from "../assets/icons/CaretRight.svg?react";
import { CATEGORIES, type RefundCategory } from "../constants/categories";
import { formatCentsToBRL } from "../lib/format";

// Mock só pra esta etapa (layout + navegação). Na sub-fase de API isso vira
// um GET /refunds real, com busca/paginação vindas do servidor.
interface MockRefund {
  id: number;
  name: string;
  category: RefundCategory;
  amount_in_cents: number;
}

const MOCK_REFUNDS: MockRefund[] = [
  { id: 1, name: "Rodrigo", category: "food", amount_in_cents: 3478 },
  { id: 2, name: "Tamires", category: "lodging", amount_in_cents: 120000 },
  { id: 3, name: "Lara", category: "food", amount_in_cents: 1235 },
  { id: 4, name: "Elias", category: "transport", amount_in_cents: 4765 },
  { id: 5, name: "Thiago", category: "service", amount_in_cents: 9990 },
  { id: 6, name: "Vinicius", category: "others", amount_in_cents: 2589 },
  { id: 7, name: "Ana", category: "food", amount_in_cents: 5200 },
  { id: 8, name: "Bruno", category: "transport", amount_in_cents: 3199 },
  { id: 9, name: "Carla", category: "lodging", amount_in_cents: 45000 },
  { id: 10, name: "Diego", category: "service", amount_in_cents: 8800 },
  { id: 11, name: "Elaine", category: "others", amount_in_cents: 1500 },
  { id: 12, name: "Fabio", category: "food", amount_in_cents: 2750 },
  { id: 13, name: "Gabriela", category: "transport", amount_in_cents: 6100 },
  { id: 14, name: "Heitor", category: "lodging", amount_in_cents: 98000 },
];

const ITEMS_PER_PAGE = 6;

export default function PageHome() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      MOCK_REFUNDS.filter((refund) =>
        refund.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

        <ul className="flex flex-col">
          {paginated.length === 0 && (
            <Text variant="paragraph-medium" className="text-gray-200 py-4 text-center">
              Nenhuma solicitação encontrada.
            </Text>
          )}
          {paginated.map((refund) => {
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

        <div className="flex items-center justify-center gap-4">
          <ButtonIcon
            icon={CaretLeftIcon}
            variant="primary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          />
          <Text variant="paragraph-medium" className="text-gray-200">
            {currentPage}/{totalPages}
          </Text>
          <ButtonIcon
            icon={CaretRightIcon}
            variant="primary"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      </div>
    </div>
  );
}
