import { Link } from "react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { USER_ROLE } from "../constants/roles";
import type { TeamUser } from "../schemas/user";

interface UsersTableProps {
  users: TeamUser[];
}

const columnHelper = createColumnHelper<TeamUser>();

// Nenhum cabeçalho é clicável, e isso é decisão: a API não aceita `sort`
// (UC-015), então um cabeçalho que parecesse ordenável ou não faria nada, ou
// ordenaria apenas as 10 linhas da página atual — que é pior, porque parece
// funcionar.
export default function UsersTable({ users }: UsersTableProps) {
  const { t } = useTranslation();

  const columns = [
    columnHelper.accessor("name", {
      header: () => t("team.columnName"),
      // A linha inteira leva à página da pessoa. O link vive na célula do nome
      // porque um <a> não pode envolver um <tr> sem HTML inválido.
      cell: (info) => (
        <Link
          to={`/team/${info.row.original.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("email", {
      header: () => t("team.columnEmail"),
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("role", {
      header: () => t("team.columnRole"),
      cell: (info) => {
        const role = USER_ROLE[info.getValue()];
        return <Badge variant={role.variant}>{t(role.labelKey)}</Badge>;
      },
    }),
    columnHelper.accessor("created_at", {
      header: () => t("team.columnCreatedAt"),
      // created_at é nullable, e um formatador que assumisse data quebraria a
      // tabela inteira por causa de uma linha. formatDate já trata o null.
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  // Mesma supressão, pela mesma razão, do RefundsTable: o
  // `eslint-plugin-react-hooks` acusa as closures headless do TanStack Table
  // (getHeaderGroups, getRowModel, …) como "incompatible library" porque não
  // consegue provar que a identidade de referência delas é estável. Nada aqui
  // memoiza sobre a referência de `table`, então o diagnóstico é falso positivo
  // — suprimido em uma linha e explicado, não desligado no arquivo.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns,
    // Só o core: a ordenação é do servidor, e aqui ela nem existe. Sem
    // getSortedRowModel a tabela não tem como reordenar nada por engano.
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="py-6 text-center text-sm text-muted-foreground"
            >
              {t("team.empty")}
            </TableCell>
          </TableRow>
        )}
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
