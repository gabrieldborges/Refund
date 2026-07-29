import { useEffect, useState } from "react";

// Converte um Blob em object URL e — o motivo de existir — revoga essa URL
// quando o componente desmonta ou o Blob é trocado.
//
// A divisão é proposital: o TanStack Query cacheia os BYTES (o Blob) e este
// hook é dono da URL. Se a URL fosse o valor cacheado, o garbage collector do
// Query poderia descartar a entrada com a URL ainda em uso na tela (imagem
// quebrada), ou mantê-la viva sem nunca revogar (vazamento). Com os bytes no
// cache, cada componente cria a SUA URL e a revoga no próprio cleanup.
//
// Mora em src/hooks (camada shared) e não dentro de features/refunds porque o
// ciclo da foto de perfil vai precisar do mesmo comportamento, e o
// eslint-plugin-boundaries proíbe uma feature de importar de outra.
export function useObjectUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      // O cleanup do render anterior já revogou a URL antiga (ver o `return`
      // logo abaixo); sem apagar o estado aqui, o hook continuaria devolvendo
      // essa URL já revogada indefinidamente depois que o blob sumisse. A
      // regra abaixo reporta no máximo uma violação por corpo de efeito e
      // aponta esta linha; a diretiva silencia o efeito inteiro, então um
      // futuro setState adicionado mais abaixo não seria checado por ela.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
