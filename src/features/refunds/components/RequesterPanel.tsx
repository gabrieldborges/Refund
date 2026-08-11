import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import { useRefunds } from "../hooks/useRefunds";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";
import { useTranslation } from "react-i18next";
import RefundStatsPanel from "./RefundStatsPanel";

interface RequesterPanelProps {
  requester: { id: number; name: string };
  // Who is looking at this panel (the reviewing admin), needed to compute
  // each row's destination via the shared getRefundHref rule. Not read from
  // context here — a feature component may not import `@/context` (see
  // getRefundHref.ts) — so the page passes it down.
  viewer: RefundViewer | null;
  // Qual linha desta lista é a solicitação aberta agora. Também é a âncora
  // das setas de navegação.
  currentRefundId: number;
}

// Uma seta: link quando há vizinho, botão desabilitado quando não há. Os dois
// estados precisam ocupar o mesmo espaço — uma seta que some desloca a outra.
function NavigationArrow({
  refund,
  viewer,
  label,
  children,
}: {
  refund: Refund | null;
  viewer: RefundViewer | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!refund) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" aria-label={label} asChild>
      <Link to={getRefundHref(refund, viewer)}>{children}</Link>
    </Button>
  );
}

// O painel do solicitante NA TELA DE REVISÃO: o núcleo compartilhado
// (RefundStatsPanel) mais as três coisas que só existem quando se está revisando
// uma solicitação específica — o cabeçalho com o nome de quem pediu, o destaque
// da linha aberta e as setas para andar entre as solicitações daquela pessoa.
//
// O núcleo saiu daqui quando a página do membro do time passou a precisar dele
// sem nada disso. As setas ficaram: são navegação de revisão, não de
// estatísticas.
export default function RequesterPanel({
  requester,
  viewer,
  currentRefundId,
}: RequesterPanelProps) {
  const { t } = useTranslation();
  // A MESMA query que o núcleo usa, então o React Query serve as duas da mesma
  // entrada de cache — nenhuma requisição extra. Ela é lida aqui porque as setas
  // precisam saber quem são os vizinhos da linha aberta.
  const { data: list } = useRefunds({
    page: 1,
    perPage: REFUNDS_PER_PAGE,
    userId: requester.id,
  });

  // Posição derivada da lista já carregada — sem estado novo. -1 significa que a
  // solicitação aberta não está nesta página (o painel carrega só a primeira);
  // nesse caso não há vizinho em nenhuma direção e as duas setas desabilitam.
  const rows = list?.attributes ?? [];
  const currentIndex = rows.findIndex((refund) => refund.id === currentRefundId);
  const previousRefund = currentIndex > 0 ? rows[currentIndex - 1] : null;
  const nextRefund =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? rows[currentIndex + 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{requester.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <RefundStatsPanel
          userId={requester.id}
          userName={requester.name}
          viewer={viewer}
          currentRefundId={currentRefundId}
          headerActions={
            <div className="flex items-center gap-1">
              <NavigationArrow
                refund={previousRefund}
                viewer={viewer}
                label={t("review.previousRequest")}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </NavigationArrow>
              <NavigationArrow
                refund={nextRefund}
                viewer={viewer}
                label={t("review.nextRequest")}
              >
                <ChevronRight className="size-4" aria-hidden />
              </NavigationArrow>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
