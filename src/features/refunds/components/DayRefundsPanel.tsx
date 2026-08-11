import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCentsToBRL } from "@/lib/format";
import { REFUND_STATUS } from "../constants/status";
import { useRefunds } from "../hooks/useRefunds";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";

interface DayRefundsPanelProps {
  // "YYYY-MM-DD". As duas pontas do filtro são o mesmo dia: o servidor transforma
  // `created_to` em "< dia + 1", então isso devolve o dia inteiro (UC-004).
  day: string;
  viewer: RefundViewer | null;
}

// As solicitações de um dia. Só a primeira página: um dia com mais de dez
// solicitações é implausível neste produto, e paginar aqui seria construir para um
// caso que não ocorre. Mas quando há mais, o painel DIZ quantas — silenciar a
// diferença seria mentir sobre o que está na tela.
export default function DayRefundsPanel({ day, viewer }: DayRefundsPanelProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRefunds({
    page: 1,
    createdFrom: day,
    createdTo: day,
  });

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </ul>
    );
  }

  // Erro nunca cai em lista vazia: um dia em branco por falha de rede seria
  // indistinguível de um dia sem solicitações.
  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("calendar.dayLoadError")}
      </p>
    );
  }

  if (data.attributes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("calendar.dayEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col overflow-hidden rounded-lg border">
        {data.attributes.map((refund) => (
          <li key={refund.id} className="border-b last:border-b-0">
            <Link
              to={getRefundHref(refund, viewer)}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/50"
            >
              <span className="min-w-0 flex-1 truncate">{refund.name}</span>
              <span
                className="text-muted-foreground"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatCentsToBRL(refund.amount_in_cents)}
              </span>
              <Badge variant={REFUND_STATUS[refund.status].variant}>
                {t(REFUND_STATUS[refund.status].labelKey)}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>

      {data.total > data.attributes.length && (
        <p className="text-xs text-muted-foreground">
          {t("calendar.dayShowing", { shown: data.attributes.length, total: data.total })}
        </p>
      )}
    </div>
  );
}
