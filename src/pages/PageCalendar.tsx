import { useLoaderData, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/useAuth";
import {
  DayRefundsPanel,
  HeatLegend,
  MonthCountsChart,
  heatMax,
  heatStepIndex,
  heatSteps,
  useDailyCounts,
} from "@/features/refunds";
import { useUiStore } from "@/stores/ui";
import type { calendarLoader } from "../router-loaders";

// "2026-08" -> "agosto de 2026", para o título dos cards. O período completo vai no
// título porque é igual em todas as marcas do eixo, que carrega só o dia.
function monthTitle(month: string, locale: string): string {
  const [year, monthNumber] = month.split("-");
  // Dia 1 ao meio-dia: o dia 1 evita o mês recuar num fuso a oeste, e o meio-dia dá
  // doze horas de folga para qualquer deslocamento.
  const date = new Date(Number(year), Number(monthNumber) - 1, 1, 12);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

// "2026-08-03" -> Date local, sem passar por Date.parse da string ISO, que
// interpretaria como UTC e podia recuar um dia no fuso de Brasília.
function toLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function PageCalendar() {
  const { t, i18n } = useTranslation();
  const { month, day } = useLoaderData<typeof calendarLoader>();
  const [, setSearchParams] = useSearchParams();
  const { user: viewer } = useAuth();
  const { data, isLoading, isError } = useDailyCounts(month);

  const countByDate = new Map((data?.days ?? []).map((entry) => [entry.date, entry.count]));

  // A escala sai do maior valor DO MÊS: com poucos por dia ela ainda usa a faixa
  // inteira, e com muitos ela continua usando. Um domínio fixo funcionaria numa
  // ponta e mentiria na outra.
  const theme = useUiStore((s) => s.theme);
  const steps = heatSteps(theme);
  const max = heatMax((data?.days ?? []).map((entry) => entry.count));

  function updateParams(next: { month?: string; day?: string | null }) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (next.month) params.set("month", next.month);
      // `null` limpa: trocar de mês precisa soltar o dia escolhido, senão a URL
      // guarda um dia que não pertence ao mês visível.
      if (next.day === null) params.delete("day");
      else if (next.day) params.set("day", next.day);
      return params;
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {data && (
        <Badge variant="secondary">
          {t(data.scope === "all" ? "dashboard.scopeAll" : "dashboard.scopeUser")}
        </Badge>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {/* <h2> aninhado porque o CardTitle do registry é uma <div>: ela dá o
                  estilo, não a semântica. */}
              <h2 className="text-sm font-medium">
                {t("calendar.gridTitle")}{" "}
                <span className="font-normal text-muted-foreground">
                  {monthTitle(month, i18n.language)}
                </span>
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading && <Skeleton className="h-72 w-full" />}

            {isError && !isLoading && (
              <p role="alert" className="text-sm text-destructive">
                {t("calendar.loadError")}
              </p>
            )}

            {!isLoading && !isError && (
              <Calendar
                mode="single"
                selected={day ? toLocalDate(day) : undefined}
                month={toLocalDate(`${month}-01`)}
                onMonthChange={(next) =>
                  updateParams({ month: toIso(next).slice(0, 7), day: null })
                }
                onSelect={(next) => updateParams({ day: next ? toIso(next) : null })}
                className="w-full"
                components={{
                  // ENVOLVE o CalendarDayButton do registry em vez de substituí-lo.
                  //
                  // A primeira versão reimplementava o botão do zero, e com isso
                  // perdia o `data-selected-single` e as classes
                  // `data-[selected-single=true]:bg-primary` que o registry aplica —
                  // era por isso que escolher um dia não dava retorno visual nenhum.
                  // O marcador de HOJE sobrevivia porque vem da célula
                  // (classNames.today), não do botão.
                  //
                  // Envolvendo, seleção, foco, teclado e o estilo de hoje continuam
                  // sendo do registry, e só o badge de contagem é nosso.
                  DayButton: ({ day: dayInfo, modifiers, ...props }) => {
                    const iso = toIso(dayInfo.date);
                    const count = countByDate.get(iso) ?? 0;
                    const stepIndex = heatStepIndex(count, max);
                    // `outside` são os dias dos meses vizinhos que a grade mostra:
                    // eles não pertencem a este mês, então não entram na escala.
                    const step =
                      stepIndex !== null && !modifiers.outside ? steps[stepIndex] : null;

                    return (
                      <CalendarDayButton
                        day={dayInfo}
                        modifiers={modifiers}
                        {...props}
                        // A cor É o dado. O número contínua sendo o do dia, e a cor
                        // dele vem medida junto com o fundo — cada par da rampa
                        // passa 4,5:1.
                        style={
                          step
                            ? { backgroundColor: step.background, color: step.foreground }
                            : undefined
                        }
                        // A contagem vive no nome acessível, porque cor não é
                        // informação para quem não a vê — e aqui ela é a única
                        // codificação visual, ao contrário do badge de antes.
                        aria-label={
                          count > 0
                            ? t("calendar.dayWithCount", {
                                day: dayInfo.date.getDate(),
                                count,
                              })
                            : undefined
                        }
                      >
                        {dayInfo.date.getDate()}
                      </CalendarDayButton>
                    );
                  },
                }}
              />
            )}

            {!isLoading && !isError && <HeatLegend max={max} />}
          </CardContent>
        </Card>

        {/* O painel do dia fica AO LADO da grade, e o gráfico do mês desceu para
            baixo dele — a ordem que se lê é: escolher o dia, ver o que houve nele, e
            só então o mês inteiro como contexto.
            
            O card existe mesmo sem dia escolhido, com uma dica no lugar do conteúdo:
            antes a segunda coluna ficava vazia até alguém clicar, e nada na tela
            dizia que clicar era possível. */}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-sm font-medium">
                {day
                  ? t("calendar.dayTitle", {
                      date: new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: "long",
                      }).format(toLocalDate(day)),
                    })
                  : t("calendar.dayPickPrompt")}
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {day ? (
              <DayRefundsPanel day={day} viewer={viewer} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("calendar.dayPickHint")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Largura inteira: o gráfico é o único elemento com eixo de tempo, e 31 dias
          num meio de tela ficam apertados. */}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm font-medium">
              {t("calendar.monthChartTitle")}{" "}
              <span className="font-normal text-muted-foreground">
                {monthTitle(month, i18n.language)}
              </span>
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthCountsChart days={data?.days ?? []} isLoading={isLoading} isError={isError} />
        </CardContent>
      </Card>

    </div>
  );
}
