import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCentsToBRL } from "@/lib/format";
import { DashboardCharts, useRefundSummary } from "@/features/refunds";
import type { dashboardLoader } from "../router-loaders";

function Kpi({
  labelKey,
  value,
  isLoading,
  isError,
}: {
  labelKey: string;
  value: string;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t(labelKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-8 w-24" />}
        {/* Erro não vira zero: um "R$ 0,00" por falha de rede é indistinguível de
            quem de fato não tem nada, e num indicador isso é pior que não mostrar. */}
        {isError && !isLoading && (
          <p role="alert" className="text-sm text-destructive">
            {t("dashboard.loadError")}
          </p>
        )}
        {!isLoading && !isError && (
          <p className="text-2xl font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PageDashboard() {
  const { t } = useTranslation();
  const { months } = useLoaderData<typeof dashboardLoader>();
  const { data: summary, isLoading, isError } = useRefundSummary(months);

  const byStatus = summary?.by_status;

  const totalRequests = byStatus
    ? Object.values(byStatus).reduce((sum, bucket) => sum + bucket.count, 0)
    : 0;

  // Aprovado + pago, e NÃO a soma dos quatro. Somar os quatro juntaria previsão
  // (pendente), passivo (aprovado), despesa realizada (paga) e nada (rejeitada) —
  // a decisão registrada em UC-014. Este é o número que o card da Home deveria
  // mostrar e não mostra, porque até agora não existia de onde tirá-lo.
  const settled =
    (byStatus?.approved.amount_in_cents ?? 0) + (byStatus?.paid.amount_in_cents ?? 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* O escopo é do servidor, e a tela precisa dizer qual é: os mesmos gráficos
          significam coisas diferentes para um admin e para um solicitante. */}
      {summary && (
        <div>
          <Badge variant="secondary">
            {t(summary.scope === "all" ? "dashboard.scopeAll" : "dashboard.scopeUser")}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          labelKey="dashboard.totalRequests"
          value={String(totalRequests)}
          isLoading={isLoading}
          isError={isError}
        />
        <Kpi
          labelKey="dashboard.settledValue"
          value={formatCentsToBRL(settled)}
          isLoading={isLoading}
          isError={isError}
        />
        <Kpi
          labelKey="dashboard.pending"
          value={String(byStatus?.pending.count ?? 0)}
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      <DashboardCharts summary={summary} isLoading={isLoading} isError={isError} />
    </div>
  );
}
