import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardTone {
  background: string;
  // Calculado do fundo, não escolhido: ver KPI_TONES em features/refunds.
  foreground: string;
}

interface StatCardProps {
  label: string;
  value: string;
  tone: StatCardTone;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage: string;
  // Linha extra sob o número, como o aviso de que o card ignora o filtro ativo.
  footnote?: ReactNode;
}

// Um indicador com fundo colorido, usado pelo Dashboard e pela Home. Existe como
// componente porque a parte difícil não é o layout: é que o card só pode ficar
// colorido QUANDO HÁ NÚMERO.
//
// Enquanto carrega ou em erro ele volta a ser neutro. Um bloco de cor com um
// esqueleto ou uma mensagem de erro dentro parece um estado válido — e a cor,
// nesta aplicação, significa status; pintar um card que não tem número seria
// afirmar algo sobre um dado que não chegou.
export default function StatCard({
  label,
  value,
  tone,
  isLoading = false,
  isError = false,
  errorMessage,
  footnote,
}: StatCardProps) {
  if (isLoading || isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            // Erro nunca cai em zero: um "0" por falha de rede leria como "não há
            // nada", em vez de "não sabemos".
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      // Cor por `style` e não por classe utilitária: os valores vêm da paleta dos
      // gráficos, em hexadecimal, e não existem como token do Tailwind. É o mesmo
      // motivo pelo qual o Nivo recebe hexadecimal.
      style={{ backgroundColor: tone.background, color: tone.foreground }}
      className="border-transparent"
    >
      <CardHeader className="pb-2">
        <CardTitle
          className="text-xs font-medium uppercase tracking-wide opacity-80"
          style={{ color: tone.foreground }}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </p>
        {footnote && <div className="text-xs opacity-80">{footnote}</div>}
      </CardContent>
    </Card>
  );
}
