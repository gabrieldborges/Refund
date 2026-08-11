import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/ui";
import { heatStepBounds, heatSteps } from "../lib/heatScale";

interface HeatLegendProps {
  max: number;
}

// A legenda é OBRIGATÓRIA aqui, não enfeite: a escala é adaptativa ao mês, então a
// mesma cor significa contagens diferentes em meses diferentes. Sem os números, o
// leitor não tem como saber o que "laranja escuro" vale neste mês.
export default function HeatLegend({ max }: HeatLegendProps) {
  const { t, i18n } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const steps = heatSteps(theme);
  const bounds = heatStepBounds(max);
  const integer = new Intl.NumberFormat(i18n.language);

  // Sem nada no mês não há escala a explicar.
  if (max <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{t("calendar.legendLabel")}</span>
      <span className="flex items-center gap-1">
        {steps.map((step, index) => (
          <span key={step.background} className="flex items-center gap-1">
            <span
              // Cor por style: os valores vêm de uma rampa medida em hexadecimal, e
              // não existem como token do Tailwind.
              style={{ backgroundColor: step.background }}
              className="inline-block size-3 rounded-sm ring-1 ring-border"
              // O quadrado é decoração: o número ao lado é que informa, e é ele que
              // o leitor de tela anuncia.
              aria-hidden
            />
            <span>{integer.format(bounds[index])}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
