import { lazy, Suspense, type ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import { REFUND_STATUS } from "../constants/status";
import { useRefundStats } from "../hooks/useRefundStats";
import { useRefunds } from "../hooks/useRefunds";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { RefundStatus } from "../schemas/refund";
import { useTranslation } from "react-i18next";

// Fixed render order for the four counters — the same four keys UC-014 always
// returns, zeros included, so this never needs a data-driven length.
const STATUS_ORDER: readonly RefundStatus[] = ["pending", "approved", "paid", "rejected"];

// Carregado sob demanda porque o @nivo/pie e sua árvore (react-spring, sete
// pacotes d3, lodash) pesam 74,2 kB gzip — um terço de tudo o mais que a
// aplicação entrega. Ver docs/performance-budget.md.
//
// A importação dinâmica só rende chunk separado enquanto NINGUÉM importar este
// módulo estaticamente: por isso o gráfico não é reexportado pela fachada da
// feature (index.ts). Quem a fachada exporta é ESTE painel, que faz o import()
// por dentro — é esse arranjo que mantém a divisão de pé, e uma reexportação
// estática do gráfico a desfaria sem erro nenhum, só com um index mais gordo.
const RefundDonutChart = lazy(() => import("./RefundDonutChart"));

interface RefundStatsPanelProps {
  // De quem são as estatísticas e a lista.
  userId: number;
  // Usado só no link para a Home, que busca por nome. O painel deliberadamente
  // NÃO desenha o nome como título: quem monta decide o invólucro, e é isso que
  // evita o nome duplicado na página do membro do time, cujo cartão de
  // identidade já o mostra.
  userName: string;
  // Quem está olhando, necessário para calcular o destino de cada linha pela
  // regra compartilhada do getRefundHref. Não vem de contexto aqui — um
  // componente de feature não pode importar `@/context` — então a página passa.
  viewer: RefundViewer | null;
  // Qual linha destacar. Opcional porque "nenhuma linha destacada" é um estado
  // legítimo, não um modo: a página do membro não tem solicitação aberta.
  currentRefundId?: number;
  // Slot à direita do título da lista. Um slot, e não um booleano de aparência:
  // o booleano manteria a decisão dentro do componente e cresceria uma flag por
  // tela nova; o slot devolve a decisão a quem chama, que passa o que quiser —
  // inclusive nada. É composição em vez de configuração.
  headerActions?: ReactNode;
}

// O núcleo compartilhado do painel de uma pessoa: as contagens por status como
// rosca (UC-014) e as solicitações dela (UC-004, só a primeira página). Usado
// pela tela de revisão, através do RequesterPanel, e pela página do membro do
// time.
//
// Sem avatar: `has_avatar` é sempre false hoje, então uma foto renderizaria as
// iniciais para todo mundo — adiado para o ciclo de foto de perfil.
export default function RefundStatsPanel({
  userId,
  userName,
  viewer,
  currentRefundId,
  headerActions,
}: RefundStatsPanelProps) {
  const { t } = useTranslation();
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useRefundStats(userId);
  const {
    data: list,
    isLoading: isListLoading,
    isError: isListError,
  } = useRefunds({ page: 1, perPage: REFUNDS_PER_PAGE, userId });

  return (
    <div className="flex flex-col gap-4">
      {/* Os cinco cards (total + quatro status) viraram uma rosca. O total
          deixou de ser um card e passou a ocupar o miolo do gráfico; os quatro
          status viraram fatias, com o percentual em cada leader line.

          Contagem, não valor: somar dinheiro dos quatro status juntaria
          previsão, passivo, despesa liquidada e nada — é o que o comentário de
          refundStatsResponseSchema registra, e ele já prevê esta soma de
          CONTAGENS no cliente.

          Carregamento e erro são delegados ao gráfico (props isLoading /
          isError) em vez de tratados aqui: um erro de estatísticas não pode cair
          em "zero renderizado", porque uma rosca zerada seria indistinguível de
          uma pessoa que de fato não tem nada. */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RefundDonutChart
          slices={STATUS_ORDER.map((status) => ({
            id: status,
            labelKey: REFUND_STATUS[status].labelKey,
            value: stats?.by_status[status].count ?? 0,
            // O vermelho da paleta é desta fatia por significado, não por
            // tamanho — mesmo quando "rejeitado" é a maior de todas.
            isNegative: status === "rejected",
          }))}
          unitLabelKey="chart.requestsUnit"
          titleKey="chart.statusTitle"
          metric="count"
          isLoading={isStatsLoading}
          isError={isStatsError}
        />
      </Suspense>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t("panel.requests")}</h3>
          {headerActions}
        </div>

        {isListLoading && (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </ul>
        )}

        {/* Same reasoning as the stats error above: silence here would be
            indistinguishable from a person with no refunds at all. */}
        {isListError && !isListLoading && (
          <p role="alert" className="text-sm text-destructive">
            {t("panel.listError")}
          </p>
        )}

        {list && !isListLoading && !isListError && (
          <>
            <ul className="flex flex-col overflow-hidden rounded-lg border">
              {list.attributes.length === 0 && (
                <li className="py-3 text-center text-sm text-muted-foreground">
                  {t("panel.empty")}
                </li>
              )}
              {list.attributes.map((refund) => {
                // `currentRefundId !== undefined` e não só a igualdade: sem a
                // guarda, um id ausente compararia undefined com cada linha e
                // acertaria em nenhuma — o que funciona por acidente, e pararia
                // de funcionar se algum dia uma linha viesse sem id.
                const isCurrent =
                  currentRefundId !== undefined && refund.id === currentRefundId;
                return (
                  <li key={refund.id} className="border-b last:border-b-0">
                    <Link
                      to={getRefundHref(refund, viewer)}
                      // Cor sozinha não é sinal acessível; aria-current é o que
                      // um leitor de tela anuncia.
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/50",
                        isCurrent && "bg-accent font-medium"
                      )}
                    >
                      <span className="truncate">{refund.name}</span>
                      <Badge variant={REFUND_STATUS[refund.status].variant}>
                        {t(REFUND_STATUS[refund.status].labelKey)}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* No pagination here on purpose — the Home already paginates, so
                point there instead of reimplementing it. Reuses the Home's
                existing `name` search (there is no `user_id` filter in its UI)
                rather than adding one. */}
            <Link
              to={`/?name=${encodeURIComponent(userName)}`}
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              {t("panel.seeAll", { name: userName })}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
