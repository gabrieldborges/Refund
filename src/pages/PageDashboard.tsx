import { useLoaderData, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatCard from "@/components/core/StatCard";
import { formatCentsToBRL } from "@/lib/format";
import { DashboardCharts, KPI_TONES, useRefundSummary } from "@/features/refunds";
import type { dashboardLoader } from "../router-loaders";

function YearPicker({ summary }: { summary: { year: number; available_years: number[] } }) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();

  // Só os anos que têm solicitações, mais o selecionado. O servidor decide a
  // lista; oferecer um ano vazio seria convidar para um gráfico vazio.
  const years = Array.from(new Set([...summary.available_years, summary.year])).sort(
    (a, b) => b - a
  );

  // Um ano só não é escolha: o seletor some em vez de aparecer com uma opção.
  if (years.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="dashboard-year" className="text-sm text-muted-foreground">
        {t("dashboard.yearLabel")}
      </Label>
      <Select
        value={String(summary.year)}
        onValueChange={(next) =>
          setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("year", next);
            return params;
          })
        }
      >
        <SelectTrigger id="dashboard-year" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PageDashboard() {
  const { t } = useTranslation();
  const { year } = useLoaderData<typeof dashboardLoader>();
  const { data: summary, isLoading, isError } = useRefundSummary(year);

  const byStatus = summary?.by_status;

  // Aprovado + pago, e NÃO a soma dos quatro. Somar os quatro juntaria previsão
  // (pendente), passivo (aprovado), despesa realizada (paga) e nada (rejeitada) —
  // a decisão registrada em UC-014. Este é o número que o card da Home deveria
  // mostrar e não mostra, porque até agora não existia de onde tirá-lo.
  const settled =
    (byStatus?.approved.amount_in_cents ?? 0) + (byStatus?.paid.amount_in_cents ?? 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* O escopo é do servidor, e a tela precisa dizer qual é: os mesmos
            gráficos significam coisas diferentes para um admin e um solicitante. */}
        {summary && (
          <Badge variant="secondary">
            {t(summary.scope === "all" ? "dashboard.scopeAll" : "dashboard.scopeUser")}
          </Badge>
        )}
        {summary && <YearPicker summary={summary} />}
      </div>

      {/* UM indicador, não três. A contagem total e a de pendentes saíram porque a
          rosca de status já as mostra — as fatias são as contagens por status, e o
          total ocupa o miolo do gráfico. Repetir um número que está dois
          centímetros abaixo não informa; ocupa espaço e convida a comparar dois
          lugares que dizem a mesma coisa.
      
          Aprovado + pago fica porque NÃO está em gráfico nenhum: os quatro gráficos
          mostram contagem por status, valor por categoria, valor por mês e status
          por mês. Nenhum deles responde "quanto a empresa já assumiu e pagou". */}
      <div className="grid gap-4 sm:max-w-xs">
        <StatCard
          label={t("dashboard.settledValue")}
          value={formatCentsToBRL(settled)}
          tone={KPI_TONES.settled}
          isLoading={isLoading}
          isError={isError}
          errorMessage={t("dashboard.loadError")}
        />
      </div>

      <DashboardCharts summary={summary} isLoading={isLoading} isError={isError} />
    </div>
  );
}
