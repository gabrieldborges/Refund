import { resolveTheme } from "@/stores/ui";
import type { RefundCategory } from "../constants/categories";

// Paleta CATEGÓRICA de cinco slots, uma cor por categoria de despesa.
//
// Por que uma paleta nova, e não a `chartPalette`: aquela tem quatro slots e um
// vermelho reservado ao significado "rejeitado". Cinco categorias em quatro slots
// obrigaria a ciclar, e ciclar cor categórica repete a primeira cor na quinta
// entidade — duas categorias da mesma cor não identificam nada. É a armadilha que o
// comentário de `sliceColor` descreve.
//
// Estes cinco foram submetidos ao validador de paletas e **passam todas as seis
// checagens nos dois modos**: faixa de luminosidade, piso de croma, separação para
// daltonismo, piso de visão normal e contraste contra a superfície. O par mais fraco
// é amarelo ↔ verde (ΔE 9,1 protan; 5,8 tritan), e a legenda é a codificação
// secundária que o valida — motivo pelo qual ela não é opcional aqui.
//
// ATENÇÃO: esta é a SEGUNDA paleta categórica da aplicação. A de status
// (`chartPalette`) continua significando pendente/aprovada/paga/rejeitada. As duas
// convivem no Dashboard, em cards diferentes e cada um com título e legenda próprios —
// mas azul de categoria e azul de status são azuis diferentes, e essa ambiguidade é o
// preço de colorir categoria. Se algum dia as duas aparecerem no MESMO gráfico, uma
// delas tem de sair.
const LIGHT: Record<RefundCategory, string> = {
  food: "#2a78d6",
  lodging: "#eb6834",
  transport: "#1baf7a",
  service: "#eda100",
  others: "#e87ba4",
};

// Degraus próprios no escuro, não a mesma lista: cada um foi validado contra a
// superfície escura. No claro três deles ficam abaixo de 3:1 contra o branco, o que o
// validador aponta como aviso e a legenda resolve; no escuro os cinco passam.
const DARK: Record<RefundCategory, string> = {
  food: "#3987e5",
  lodging: "#d95926",
  transport: "#199e70",
  service: "#c98500",
  others: "#d55181",
};

export function categoryColor(
  category: RefundCategory,
  theme: Parameters<typeof resolveTheme>[0]
): string {
  return (resolveTheme(theme) === "dark" ? DARK : LIGHT)[category];
}
