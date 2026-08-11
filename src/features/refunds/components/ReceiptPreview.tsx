import { useState } from "react";
import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useReceipt, type ReceiptKind } from "../hooks/useReceipt";
import { useTranslation } from "react-i18next";

interface ReceiptPreviewProps {
  refundId: string;
  refundName: string;
  // Which file this preview shows. Required rather than defaulted: a paid
  // refund renders TWO of these on the same screen (expense + payment), and
  // an implicit default would make it easy to wire both up pointing at the
  // same one by accident.
  kind: ReceiptKind;
}

// Copy that differs between the two files this component can show. Keeping it
// as a lookup table (instead of inline ternaries sprinkled through the JSX) is
// what keeps the fullscreen button's accessible name distinct between the expense
// and payment previews: with two previews on one screen, an unqualified
// "Ver em tela cheia" would be indistinguishable to a screen reader.
//
// The VISIBLE text is now the short, unqualified one — the qualified version
// ("Ver comprovante de pagamento em tela cheia") overflowed the card on a 390px
// screen. What disambiguates is split in two:
//   - `ariaKey`, the qualified string, on aria-label — so the accessible name
//     stays distinct even though the two buttons look identical;
//   - `headingKey`, a visible heading above each preview, so a sighted person
//     also knows which file is which without reading the button.
// Dropping the qualifier from the button WITHOUT one of those would have undone
// the reason this table exists.
//
// Catalogue keys, not copy: this Record is evaluated at import time, before a
// locale exists. The name key interpolates {{name}} rather than concatenating,
// so a language that puts the qualifier first can reorder it in the catalogue
// without touching this file.
const RECEIPT_COPY: Record<
  ReceiptKind,
  { nameKey: string; headingKey: string; ariaKey: string }
> = {
  expense: {
    nameKey: "receipt.expenseName",
    headingKey: "receipt.expenseLabel",
    ariaKey: "receipt.viewFullscreen",
  },
  payment: {
    nameKey: "receipt.paymentName",
    headingKey: "receipt.paymentLabel",
    ariaKey: "receipt.viewPaymentFullscreen",
  },
};

// A caixa do comprovante tem proporção fixa, e é isso que impede a página de
// pular quando o arquivo chega. Antes havia TRÊS saltos somados: o skeleton era
// h-48 e a imagem carregada, max-h-64; o botão "tela cheia" só passava a existir
// depois do carregamento; e, sem proporção reservada, a altura final ainda
// dependia do formato da foto — retrato e paisagem davam páginas de tamanhos
// diferentes.
//
// 4:3 em vez de quadrado: comprovante é quase sempre um recibo ou uma nota
// fotografada, e 4:3 desperdiça menos área com faixas vazias do que 1:1 sem
// alongar demais a coluna no mobile. `object-contain` garante que nada seja
// cortado — o que sobra vira fundo, não recorte.
const MEDIA_BOX = "relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted/30";

export default function ReceiptPreview({ refundId, refundName, kind }: ReceiptPreviewProps) {
  const { t } = useTranslation();
  const { data: file, isPending, isError } = useReceipt(refundId, kind);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Guarda a URL que TERMINOU de decodificar, não um booleano: quando o arquivo
  // troca (a tela de um reembolso pago mostra dois comprovantes, e navegar entre
  // solicitações troca a URL sem desmontar), comparar a URL faz o skeleton
  // voltar sozinho. Um booleano ficaria preso em `true` e mostraria a caixa
  // vazia até a imagem nova aparecer de estalo.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const { nameKey, headingKey, ariaKey } = RECEIPT_COPY[kind];
  const alt = t(nameKey, { name: refundName });
  // Curto no visível, qualificado no acessível — ver RECEIPT_COPY.
  const fullscreenLabel = t("receipt.viewFullscreenShort");
  const fullscreenAriaLabel = t(ariaKey);

  // Item 22: a URL não carrega tipo, então o backend manda `media_type` junto —
  // derivado da extensão armazenada, nunca de um cabeçalho do cliente. Sem esse
  // campo não daria para escolher entre <img> e <object> ANTES de buscar.
  const isImage = file?.media_type.startsWith("image/") ?? false;
  // `!file` na guarda: um refetch em segundo plano (ex.: voltar para a aba)
  // que falhar também vira isError, mas o Query mantém a URL anterior em
  // `data`. Sem essa condição, um blip de rede trocaria um comprovante
  // funcionando por uma mensagem de erro.
  const hasFailed = isError && !file;
  const isLoading = (isPending || !file) && !hasFailed;
  // Só a imagem tem um evento de carregamento confiável; <object> (PDF) não
  // avisa quando terminou, então para ele o skeleton sai assim que a URL chega.
  const isImageDecoding = !!file && isImage && loadedUrl !== file.url;

  return (
    // data-slot: mesma convenção do design system (ui/*.tsx). Existe porque uma
    // tela de reembolso pago mostra DOIS previews, e "de qual preview é este
    // botão?" precisa de uma âncora estável — antes os testes subiam a árvore
    // com closest("div"), que passou a apontar para a caixa da mídia assim que
    // ela ganhou um elemento a mais.
    <div data-slot="receipt-preview" className="flex flex-col gap-2">
      {/* Diz QUAL dos dois comprovantes é este. Com o botão de tela cheia
          encurtado, é o que sobra identificando o arquivo para quem vê a tela. */}
      <h3 className="text-sm font-medium">{t(headingKey)}</h3>

      <div className={MEDIA_BOX}>
        {hasFailed && (
          <p
            role="alert"
            className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-destructive"
          >
            Não foi possível carregar o comprovante.
          </p>
        )}

        {/* O skeleton ocupa a mesma caixa por cima, em vez de substituí-la: é a
            sobreposição que mantém a altura idêntica antes e depois. */}
        {(isLoading || isImageDecoding) && <Skeleton className="absolute inset-0 rounded-none" />}

        {file && isImage && (
          <img
            src={file.url}
            alt={alt}
            onLoad={() => setLoadedUrl(file.url)}
            className="size-full object-contain"
          />
        )}

        {file && !isImage && (
          <object data={file.url} type={file.media_type} className="size-full" aria-label={alt} title={alt}>
            <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              {t("receipt.open")}
            </a>
          </object>
        )}
      </div>

      {/* Renderizado sempre, desabilitado enquanto não há arquivo: um botão que
          só aparece depois do carregamento empurraria tudo abaixo dele. */}
      <Button
        variant="outline"
        size="sm"
        className="self-end"
        disabled={!file}
        // O nome acessível continua qualificado, mesmo com os dois botões da tela
        // mostrando o mesmo texto curto.
        aria-label={fullscreenAriaLabel}
        onClick={() => setIsFullscreen(true)}
      >
        <Expand className="size-4" aria-hidden />
        {fullscreenLabel}
      </Button>

      {/* `file &&` em vez do antigo acesso direto: o componente agora renderiza
          a mesma árvore em todos os estados, então aqui o arquivo pode ainda não
          existir. O botão que abre este diálogo fica desabilitado nesse caso. */}
      {file && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{alt}</DialogTitle>
              <DialogDescription>{t("receipt.fullscreenDescription")}</DialogDescription>
            </DialogHeader>
            {isImage ? (
              <img src={file.url} alt={alt} className="max-h-[70vh] w-full object-contain" />
            ) : (
              <object
                data={file.url}
                type={file.media_type}
                className="h-[70vh] w-full"
                aria-label={alt}
                title={alt}
              >
                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                  {t("receipt.open")}
                </a>
              </object>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
