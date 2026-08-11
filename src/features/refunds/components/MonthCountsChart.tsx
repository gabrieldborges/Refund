import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RefundDayCount } from "../schemas/dailyCounts";

// Mesmo arranjo do DashboardCharts, e pela mesma razão: o gráfico entra por
// import() dinâmico, e este contêiner é o que a fachada exporta. Uma reexportação
// estática do gráfico traria a árvore do nivo de volta ao bundle de entrada sem erro
// nenhum — ver docs/performance-budget.md.
const RefundLineChart = lazy(() => import("./RefundLineChart"));

interface MonthCountsChartProps {
  days: RefundDayCount[];
  isLoading?: boolean;
  isError?: boolean;
}

// Só o DIA no eixo X: o mês e o ano vivem no título do card, porque são iguais nas
// 31 marcas — a regra registrada no panorama para granularidade diária.
function dayLabel(date: string): string {
  return String(Number(date.split("-")[2]));
}

// Contagem por dia. Sem rótulo de unidade: uma contagem é uma contagem, e declarar
// "em solicitações" acima do gráfico cujo título já diz isso seria repetição.
export default function MonthCountsChart({
  days,
  isLoading = false,
  isError = false,
}: MonthCountsChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const integer = new Intl.NumberFormat(i18n.language);

  const points = days.map((day) => ({
    label: dayLabel(day.date),
    value: day.count,
    // O exato é o próprio número aqui, mas com a data por extenso: o tooltip é onde
    // se descobre QUAL dia é o ponto, já que o eixo mostra só o número do dia.
    exact: t("calendar.dayTooltip", {
      day: dayLabel(day.date),
      count: day.count,
      formatted: integer.format(day.count),
    }),
  }));

  // 31 rótulos não cabem em 390px. No mobile rotulamos de cinco em cinco, mais o
  // último — a série mantém os 31 pontos, só a rotulagem afina.
  const visibleLabels = isMobile
    ? points
        .filter((_, index) => index % 5 === 0 || index === points.length - 1)
        .map((point) => point.label)
    : undefined;

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RefundLineChart
        points={points}
        titleKey="calendar.monthChartTitle"
        visibleLabels={visibleLabels}
        isLoading={isLoading}
        isError={isError}
      />
    </Suspense>
  );
}
