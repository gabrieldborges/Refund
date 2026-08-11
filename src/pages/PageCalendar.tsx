import { useLoaderData, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/useAuth";
import { DayRefundsPanel, MonthCountsChart, useDailyCounts } from "@/features/refunds";
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
          <CardContent>
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
                  // A contagem do dia dentro do próprio botão. SEM badge nos dias
                  // zerados: num calendário a ausência de marca já lê como zero, e 31
                  // zeros seriam ruído.
                  DayButton: ({ day: dayInfo, modifiers, ...props }) => {
                    const iso = toIso(dayInfo.date);
                    const count = countByDate.get(iso) ?? 0;
                    return (
                      <button
                        {...props}
                        // O nome acessível traz a contagem: quem usa leitor de tela
                        // não vê o badge, e "3" sozinho não diz o que é.
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
                        {count > 0 && !modifiers.outside && (
                          <span
                            aria-hidden
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1 text-[0.625rem] leading-tight text-primary-foreground"
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  },
                }}
              />
            )}
          </CardContent>
        </Card>

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
            <MonthCountsChart
              days={data?.days ?? []}
              isLoading={isLoading}
              isError={isError}
            />
          </CardContent>
        </Card>
      </div>

      {day && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-sm font-medium">
                {t("calendar.dayTitle", {
                  date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(
                    toLocalDate(day)
                  ),
                })}
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DayRefundsPanel day={day} viewer={viewer} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
