// Public API (façade) of the refunds feature. The rest of the app must import
// from "features/refunds", never from an internal path like
// "features/refunds/hooks/useRefund". Item 9 will turn this convention into an
// ESLint rule. Internal details (refundKeys, response schemas, CATEGORY_VALUES)
// are intentionally NOT re-exported here.

// Data-access layer: query options reused by the router loaders.
export { refundListQuery, refundDetailQuery } from "./api/refundQueries";
export { refundStatsQuery } from "./api/reviewQueries";

// Hooks: the feature's data API for pages.
export { useRefunds } from "./hooks/useRefunds";
export { useRefund } from "./hooks/useRefund";
export { useCreateRefund } from "./hooks/useCreateRefund";
export { useDeleteRefund } from "./hooks/useDeleteRefund";
export { useRefundStats } from "./hooks/useRefundStats";
// Contagem global de pendentes para o card do admin. Independente do filtro
// e da paginação da listagem, de propósito.
export { usePendingCount } from "./hooks/usePendingCount";
export { useReviewRefund } from "./hooks/useReviewRefund";
export { usePayRefund } from "./hooks/usePayRefund";
export { useRefundReviews } from "./hooks/useRefundReviews";

// A próxima solicitação pendente revisável, para a navegação em fila da tela
// de revisão. Pula a solicitação aberta e as do próprio admin (BR-016).
export { useNextPendingRefund } from "./hooks/useNextPendingRefund";

// URL search-params schema used by the home loader.
export { refundListSearchParamsSchema } from "./schemas/refund";
export type { RefundSort, RefundOrder, RefundStatus } from "./schemas/refund";

// Domain constants consumed by pages.
export { CATEGORIES, CATEGORY_OPTIONS } from "./constants/categories";
export { REFUNDS_PER_PAGE } from "./constants/pagination";
export { REFUND_STATUS } from "./constants/status";

// BR-016 route rule: which page a refund row should link to for the current
// viewer. Shared by the Home's list and RequesterPanel (Task 9) so the two
// never carry two copies of the same condition.
export { getRefundHref, type RefundViewer } from "./lib/getRefundHref";

// Feature component mounted by the app shell (MainLayout).
export { default as RefundFormDialog } from "./components/RefundFormDialog";

// Receipt preview: renders a receipt Blob inline with a fullscreen dialog.
// The `kind` prop picks expense (UC-010) vs payment (UC-012) receipt.
export { default as ReceiptPreview } from "./components/ReceiptPreview";

// Review decision controls: approve/reject buttons and the reject-reason dialog.
export { default as ReviewDecision } from "./components/ReviewDecision";

// Mark-as-paid dialog: uploads the mandatory payment receipt (UC-012).
export { default as PayRefundDialog } from "./components/PayRefundDialog";

// Review history timeline: the closed loop for a rejection's reason (UC-013).
export { default as ReviewTimeline } from "./components/ReviewTimeline";

// Requester panel: name, per-status counters and the requester's own refunds
// (first page), shown on the review screen so an admin judges one request
// against that person's history instead of in isolation (UC-014).
export { default as RequesterPanel } from "./components/RequesterPanel";

// O núcleo compartilhado do painel acima: a rosca de contagens por status e a
// primeira página das solicitações de uma pessoa, sem cabeçalho e sem as setas
// de revisão. A página do membro do time o usa direto.
//
// Este é o único caminho pelo qual o gráfico entra na aplicação. O
// RefundDonutChart NÃO é reexportado aqui de propósito: este painel faz o
// import() dinâmico dele por dentro, e uma reexportação estática do gráfico
// traria os 74,2 kB gzip do chunk de volta ao bundle de entrada sem erro nenhum
// — ver docs/performance-budget.md.
export { default as RefundStatsPanel } from "./components/RefundStatsPanel";

// A listagem da Home como tabela (Item 13). Ordenação e filtro são
// server-side: o componente não ordena nada por conta própria.
export { default as RefundsTable } from "./components/RefundsTable";

// Toolbar da listagem: filtro por status, escrito na URL e resolvido no
// servidor (UC-004).
export { default as RefundsToolbar } from "./components/RefundsToolbar";

// A query e o hook do resumo agregado (UC-017), que alimenta o Dashboard inteiro
// numa requisição.
export { refundSummaryQuery } from "./api/summaryQueries";
export { useRefundSummary } from "./hooks/useRefundSummary";
export { refundSummarySearchParamsSchema } from "./schemas/summary";
export type { RefundSummary } from "./schemas/summary";

// Os quatro gráficos do Dashboard, atrás de UM contêiner. Os gráficos em si NÃO
// são exportados aqui, e isso não é organização: uma reexportação estática de
// qualquer um deles traria o chunk do Nivo de volta ao bundle de entrada sem erro
// nenhum. O contêiner faz o import() dinâmico por dentro — ver
// docs/performance-budget.md.
export { default as DashboardCharts } from "./components/DashboardCharts";
