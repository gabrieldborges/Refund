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
// as a lookup table (instead of inline ternaries sprinkled through the JSX)
// is what keeps the fullscreen button's accessible name distinct between the
// expense and payment previews — see the "Ver ... em tela cheia" trap this
// fixes: with two previews on one screen, an unqualified "Ver em tela cheia"
// button would be indistinguishable to a screen reader.
// Catalogue keys, not copy: this Record is evaluated at import time, before a
// locale exists. The name key interpolates {{name}} rather than concatenating,
// so a language that puts the qualifier first can reorder it in the catalogue
// without touching this file.
const RECEIPT_COPY: Record<ReceiptKind, { nameKey: string; buttonKey: string }> = {
  expense: {
    nameKey: "receipt.expenseName",
    buttonKey: "receipt.viewFullscreen",
  },
  payment: {
    nameKey: "receipt.paymentName",
    buttonKey: "receipt.viewPaymentFullscreen",
  },
};

export default function ReceiptPreview({ refundId, refundName, kind }: ReceiptPreviewProps) {
  const { t } = useTranslation();
  const { data: file, isPending, isError } = useReceipt(refundId, kind);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // `!file` na guarda: um refetch em segundo plano (ex.: voltar para a aba)
  // que falhar também vira isError, mas o Query mantém a URL anterior em
  // `data`. Sem essa condição, um blip de rede trocaria um comprovante
  // funcionando por uma mensagem de erro.
  if (isError && !file) {
    return (
      <p role="alert" className="py-4 text-center text-sm text-destructive">
        Não foi possível carregar o comprovante.
      </p>
    );
  }

  if (isPending || !file) {
    return <Skeleton className="h-48 w-full" />;
  }

  // Item 22: a URL não carrega tipo, então o backend manda `media_type` junto —
  // derivado da extensão armazenada, nunca de um cabeçalho do cliente. Sem esse
  // campo não daria para escolher entre <img> e <object> ANTES de buscar.
  const isImage = file.media_type.startsWith("image/");
  const { nameKey, buttonKey } = RECEIPT_COPY[kind];
  const alt = t(nameKey, { name: refundName });
  const fullscreenButtonLabel = t(buttonKey);

  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        <img src={file.url} alt={alt} className="max-h-64 w-full rounded-md object-contain" />
      ) : (
        <object
          data={file.url}
          type={file.media_type}
          className="h-64 w-full rounded-md"
          aria-label={alt}
          title={alt}
        >
          <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {t("receipt.open")}
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
                Abrir comprovante
              </a>
            </object>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
