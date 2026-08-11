import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "../constants/categories";
import { REFUND_STATUS } from "../constants/status";
import type { RefundCategory } from "../constants/categories";
import type { RefundStatus } from "../schemas/refund";
import type { RefundSummary } from "../schemas/summary";

// O ÚNICO ponto de import() dinâmico dos gráficos, e o único módulo desta feature
// que a fachada exporta. Nenhum gráfico é reexportado por index.ts: uma
// reexportação estática traria o chunk do Nivo (74 kB gzip antes de bar e line)
// de volta ao bundle de entrada sem erro nenhum, só com um index mais gordo — ver
// docs/performance-budget.md.
//
// Um import() para os quatro, e não quatro imports: eles compartilham @nivo/core e
// os pacotes d3-*, então quatro pontos produziriam quatro chunks com a mesma
// árvore duplicada ou um chunk comum extra sem ganho nenhum.
const RefundDonutChart = lazy(() => import("./RefundDonutChart"));
const RefundBarChart = lazy(() => import("./RefundBarChart"));
const RefundLineChart = lazy(() => import("./RefundLineChart"));
const RefundStackedBarChart = lazy(() => import("./RefundStackedBarChart"));

const STATUS_ORDER: readonly RefundStatus[] = ["pending", "approved", "paid", "rejected"];
const CATEGORY_ORDER = Object.keys(CATEGORIES) as RefundCategory[];

interface DashboardChartsProps {
  summary: RefundSummary | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

function ChartCard({ titleKey, children }: { titleKey: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {/* <h2> aninhado porque o CardTitle do registry é uma <div>: ela dá o
              estilo, não a semântica. Sem heading, uma tela de quatro gráficos não
              tem estrutura para quem navega por headings. */}
          <h2 className="text-sm font-medium">{t(titleKey)}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function DashboardCharts({
  summary,
  isLoading = false,
  isError = false,
}: DashboardChartsProps) {
  // Os quatro gráficos recebem isLoading/isError e tratam internamente, em vez de
  // esta função devolver cedo: um erro não pode cair em "zero renderizado", e
  // devolver cedo aqui esconderia os títulos junto, deixando a tela sem dizer o que
  // falhou.
  const statusSlices = STATUS_ORDER.map((status) => ({
    id: status,
    labelKey: REFUND_STATUS[status].labelKey,
    value: summary?.by_status[status].count ?? 0,
    // O vermelho da paleta é desta fatia por significado, não por tamanho.
    isNegative: status === "rejected",
  }));

  const categoryBars = CATEGORY_ORDER.map((category) => ({
    id: category,
    labelKey: CATEGORIES[category].labelKey,
    value: summary?.by_category[category].amount_in_cents ?? 0,
  }));

  const linePoints = (summary?.by_month ?? []).map((month) => ({
    label: month.month,
    value: month.amount_in_cents,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard titleKey="chart.statusTitle">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RefundDonutChart
            slices={statusSlices}
            unitLabelKey="chart.requestsUnit"
            titleKey="chart.statusTitle"
            metric="count"
            isLoading={isLoading}
            isError={isError}
          />
        </Suspense>
      </ChartCard>

      <ChartCard titleKey="chart.categoryTitle">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RefundBarChart
            bars={categoryBars}
            titleKey="chart.categoryTitle"
            metric="currency"
            isLoading={isLoading}
            isError={isError}
          />
        </Suspense>
      </ChartCard>

      <ChartCard titleKey="chart.monthlyValueTitle">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RefundLineChart
            points={linePoints}
            titleKey="chart.monthlyValueTitle"
            metric="currency"
            isLoading={isLoading}
            isError={isError}
          />
        </Suspense>
      </ChartCard>

      <ChartCard titleKey="chart.monthlyStatusTitle">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RefundStackedBarChart
            months={summary?.by_month ?? []}
            titleKey="chart.monthlyStatusTitle"
            isLoading={isLoading}
            isError={isError}
          />
        </Suspense>
      </ChartCard>
    </div>
  );
}
