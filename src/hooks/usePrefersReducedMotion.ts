import { useSyncExternalStore } from "react";

// `src/index.css` já protege quem liga "reduzir movimento" das animações em
// CSS. Nada disso alcança uma animação escrita em JavaScript — o nivo anima os
// arcos do gráfico com react-spring, que interpola em JS e escreve direto no
// elemento. Para desligá-la é preciso ler a preferência em tempo de execução.
//
// useSyncExternalStore, e não useState + useEffect: é a API que o React oferece
// justamente para ler um valor que vive FORA do React (aqui, o matchMedia do
// navegador). Ela cuida de assinar, cancelar a assinatura e manter o valor
// consistente entre renderizações, e devolve o valor certo já na primeira —
// sem o frame inicial errado que um useEffect produziria.
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
