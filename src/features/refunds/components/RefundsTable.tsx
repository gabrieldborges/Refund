import { useMemo } from "react";
import { Link } from "react-router";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCentsToBRL, formatDate } from "@/lib/format";
import { CATEGORIES } from "../constants/categories";
import { REFUND_STATUS } from "../constants/status";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";

// Column-level styling hook. The TanStack types carry no `className`, so the
// table's own meta slot is augmented instead of threading a parallel lookup
// table through every render.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

interface RefundsTableProps {
  refunds: Refund[];
  viewer: RefundViewer | null;
  isLoading: boolean;
}

// Os ids das colunas ordenáveis são EXATAMENTE os valores que `sort` aceita em
// UC-004. Isso não é coincidência: a Task 5 usa `column.id` direto como
// parâmetro, então um id divergente viraria um 422 silencioso.
function createRefundColumns(viewer: RefundViewer | null): ColumnDef<Refund>[] {
  return [
    {
      id: "category",
      header: () => <span className="sr-only">Categoria</span>,
      enableSorting: false,
      meta: { className: "hidden w-10 sm:table-cell" },
      cell: ({ row }) => {
        const category = CATEGORIES[row.original.category];
        const CategoryIcon = category.icon;
        return (
          <>
            <CategoryIcon className="size-5 text-muted-foreground" aria-hidden />
            {/* O ícone sozinho é silencioso para leitor de tela; na lista
                antiga o rótulo da categoria ficava ao lado do título. */}
            <span className="sr-only">{category.label}</span>
          </>
        );
      },
    },
    {
      id: "name",
      header: "Título",
      cell: ({ row }) => (
        <Link
          to={getRefundHref(row.original, viewer)}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "user",
      header: "Solicitante",
      enableSorting: false,
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => row.original.user.name,
    },
    {
      id: "created_at",
      header: "Data",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={REFUND_STATUS[row.original.status].variant}>
          {REFUND_STATUS[row.original.status].label}
        </Badge>
      ),
    },
    {
      id: "amount_in_cents",
      header: "Valor",
      cell: ({ row }) => formatCentsToBRL(row.original.amount_in_cents),
      meta: { className: "text-right" },
    },
  ];
}

export default function RefundsTable({ refunds, viewer, isLoading }: RefundsTableProps) {
  const columns = useMemo(() => createRefundColumns(viewer), [viewer]);

  // Two mechanisms with different purposes: screen width is CSS
  // (meta.className), role is table state. Mixing them would make a media
  // query depend on JS measuring the viewport.
  const columnVisibility = useMemo(() => ({ user: viewer?.role === "admin" }), [viewer?.role]);

  // `eslint-plugin-react-hooks`'s recommended config flags TanStack Table's
  // headless closures (getHeaderGroups, getRowModel, …) as an "incompatible
  // library" because it cannot prove their reference identity is stable.
  // Nothing downstream memoizes on `table`'s reference, so the diagnostic is
  // a false positive here — narrowly suppressed and explained, the same
  // convention as the vendored warnings in eslint.config.js:120-138, though
  // those are file-scoped exemptions for runtime-shaped bugs in copied
  // shadcn code, not quite this line-scoped case.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: refunds,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    // O cliente tem 10 de N linhas. Ordenar, filtrar ou paginar aqui
    // trabalharia sobre a página, não sobre o conjunto — o erro que originou
    // o ciclo de backend da consulta da listagem.
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={cn(header.column.columnDef.meta?.className)}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                Nenhuma solicitação encontrada.
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.className)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
