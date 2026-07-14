import { useEffect, useState } from "react";

// Só atualiza o valor devolvido depois que `value` parar de mudar por `delayMs`.
// Uso típico: campo de busca, pra não disparar uma requisição a cada tecla.
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
