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
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useReceipt, type ReceiptKind } from "../hooks/useReceipt";

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
// as a lookup table (instead of inline ternaries sprinkled through the JSX)
// is what keeps the fullscreen button's accessible name distinct between the
// expense and payment previews — see the "Ver ... em tela cheia" trap this
// fixes: with two previews on one screen, an unqualified "Ver em tela cheia"
// button would be indistinguishable to a screen reader.
const RECEIPT_COPY: Record<ReceiptKind, { name: (refundName: string) => string; button: string }> = {
  expense: {
    name: (refundName) => `Comprovante de ${refundName}`,
    button: "Ver comprovante em tela cheia",
  },
  payment: {
    name: (refundName) => `Comprovante de pagamento de ${refundName}`,
    button: "Ver comprovante de pagamento em tela cheia",
  },
};

export default function ReceiptPreview({ refundId, refundName, kind }: ReceiptPreviewProps) {
  const { data: blob, isPending, isError } = useReceipt(refundId, kind);
  // Uma URL, um dono: ela é criada aqui e a MESMA string vai para o diálogo de
  // tela cheia. Se o diálogo criasse a sua, seriam dois donos de um recurso que
  // precisa ser revogado exatamente uma vez.
  const objectUrl = useObjectUrl(blob);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // `!blob` na guarda: um refetch em segundo plano (ex.: voltar para a aba)
  // que falhar também vira isError, mas o Query mantém os bytes antigos em
  // `data`. Sem essa condição, um blip de rede trocaria um comprovante
  // funcionando por uma mensagem de erro.
  if (isError && !blob) {
    return (
      <p role="alert" className="py-4 text-center text-sm text-destructive">
        Não foi possível carregar o comprovante.
      </p>
    );
  }

  if (isPending || !objectUrl) {
    return <Skeleton className="h-48 w-full" />;
  }

  // O tipo vem de graça: o backend define o Content-Type pela extensão
  // armazenada e o Blob carrega isso. Nenhum campo novo no contrato.
  const isImage = blob.type.startsWith("image/");
  const { name: nameFor, button: fullscreenButtonLabel } = RECEIPT_COPY[kind];
  const alt = nameFor(refundName);

  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        <img src={objectUrl} alt={alt} className="max-h-64 w-full rounded-md object-contain" />
      ) : (
        <object
          data={objectUrl}
          type={blob.type}
          className="h-64 w-full rounded-md"
          aria-label={alt}
          title={alt}
        >
          <a href={objectUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            Abrir comprovante
          </a>
        </object>
      )}

      <Button variant="outline" size="sm" className="self-end" onClick={() => setIsFullscreen(true)}>
        <Expand className="size-4" aria-hidden />
        {fullscreenButtonLabel}
      </Button>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
            <DialogDescription>Visualização em tela cheia do comprovante.</DialogDescription>
          </DialogHeader>
          {isImage ? (
            <img src={objectUrl} alt={alt} className="max-h-[70vh] w-full object-contain" />
          ) : (
            <object
              data={objectUrl}
              type={blob.type}
              className="h-[70vh] w-full"
              aria-label={alt}
              title={alt}
            >
              <a href={objectUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                Abrir comprovante
              </a>
            </object>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
