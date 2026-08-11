import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartFrameProps {
  // Rótulo acessível completo, COM os números. Quem usa leitor de tela não "vê"
  // as marcas, e "gráfico de barras" não informa nada — nenhum valor do gráfico
  // pode existir apenas em pixel.
  ariaLabel: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
}

// Os três estados que todo gráfico desta feature precisa tratar do mesmo jeito,
// num lugar só. A ordem importa: erro é checado ANTES de vazio, porque um gráfico
// zerado por falha de rede seria indistinguível de quem de fato não tem nada — e
// essa confusão é o pior resultado possível numa tela de números.
export default function ChartFrame({
  ariaLabel,
  isLoading = false,
  isError = false,
  isEmpty = false,
  children,
}: ChartFrameProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return (
      <p role="alert" className="py-8 text-center text-sm text-destructive">
        {t("chart.error")}
      </p>
    );
  }

  if (isEmpty) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("chart.empty")}</p>;
  }

  return (
    // role/aria-label no contêiner, não no <svg>: um elemento com role="img" faz o
    // leitor de tela tratar toda a subárvore como uma imagem só, que é exatamente
    // o que um gráfico é para quem não o vê. A altura é fluida e a largura vem do
    // contêiner — o Nivo mede o elemento e desenha dentro dele.
    <div className="h-[clamp(14rem,32vh,20rem)] w-full" role="img" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
