import { useState, type ChangeEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InputFile from "@/components/ui/input-file";
import { getApiErrorMessage } from "@/lib/api";
import { AVATAR_ACCEPT, avatarRejectionKey } from "../constants/avatar";
import { useAvatarUrl } from "../hooks/useAvatarUrl";
import { useRemoveAvatar } from "../hooks/useRemoveAvatar";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import UserAvatar from "./UserAvatar";

interface AvatarUploadDialogProps {
  // Só a PRÓPRIA foto: os endpoints são /users/me/avatar, então ninguém troca a de
  // outra pessoa — nem um admin. É por isso que este diálogo não recebe um usuário
  // qualquer, e sim o da sessão.
  userId: number | undefined;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AvatarUploadDialog({
  userId,
  name,
  open,
  onOpenChange,
}: AvatarUploadDialogProps) {
  const { t } = useTranslation();
  const [rejectionKey, setRejectionKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: current } = useAvatarUrl(userId);
  const upload = useUploadAvatar(userId);
  const remove = useRemoveAvatar(userId);

  const isBusy = upload.isPending || remove.isPending;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    upload.reset();
    remove.reset();

    if (!chosen) {
      setFile(null);
      setRejectionKey(null);
      return;
    }

    // Recusa ANTES de subir: 4 MB por uma rede móvel é uma espera longa para
    // terminar em 422. O servidor recusa igual — esta checagem economiza a viagem,
    // não substitui a dele.
    const rejection = avatarRejectionKey(chosen);
    setRejectionKey(rejection);
    setFile(rejection ? null : chosen);
  }

  async function handleUpload() {
    if (!file) return;
    await upload.mutateAsync(file);
    setFile(null);
    onOpenChange(false);
  }

  async function handleRemove() {
    await remove.mutateAsync();
    onOpenChange(false);
  }

  const mutationError = upload.error ?? remove.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("avatar.title")}</DialogTitle>
          <DialogDescription>{t("avatar.description")}</DialogDescription>
        </DialogHeader>

        {/* Empilhado no mobile, lado a lado a partir de sm. O campo de arquivo é ele
            próprio duas linhas (rótulo + campo), e ao lado de um avatar de 64px numa
            tela de 390px sobrava largura demais pouca para o nome do arquivo. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          {/* A foto atual, no mesmo componente que o resto da aplicação usa: se ela
              renderizar errado aqui, renderiza errado em todo lugar.
              
              Clicável só quando HÁ foto: um botão que amplia as iniciais não amplia
              nada. Sem foto ela é só a imagem, sem afordância de clique. */}
          {current?.url ? (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              aria-label={t("avatar.viewFullscreen")}
              className="shrink-0 rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <UserAvatar userId={userId} name={name} className="size-20 sm:size-16" />
            </button>
          ) : (
            <UserAvatar userId={userId} name={name} className="size-20 shrink-0 sm:size-16" />
          )}
          {/* min-w-0 é o que permite o nome longo do arquivo encurtar em vez de
              empurrar o campo — a armadilha que o próprio InputFile documenta. */}
          <div className="w-full min-w-0 sm:flex-1">
            <InputFile
              // Sem isto o campo herdava os padrões do comprovante: rótulo
              // "Comprovante" e placeholder "Nome do arquivo.pdf" — e PDF é
              // justamente o formato que um avatar não aceita.
              label={t("avatar.fileLabel")}
              placeholder={t("avatar.filePlaceholder")}
              accept={AVATAR_ACCEPT}
              onChange={handleChange}
              disabled={isBusy}
            />
          </div>
        </div>

        {rejectionKey && (
          <p role="alert" className="text-sm text-destructive">
            {t(rejectionKey)}
          </p>
        )}

        {mutationError && (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(mutationError)}
          </p>
        )}

        {/* Sem `sm:justify-between` e sem <span /> de enchimento: o DialogFooter já é
            flex-col-reverse no mobile e sm:justify-end no desktop, e o `sm:mr-auto`
            no botão de remover é o que o empurra para a esquerda a partir de sm. O
            placeholder vazio de antes virava um item de flex no empilhamento. */}
        <DialogFooter>
          {/* Remover só existe quando há o que remover: um botão que apaga nada é um
              botão que só pode dar erro. */}
          {current?.url && (
            <Button
              type="button"
              variant="outline"
              className="sm:mr-auto"
              onClick={handleRemove}
              disabled={isBusy}
              aria-busy={remove.isPending}
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              {t("avatar.remove")}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isBusy}
            aria-busy={upload.isPending}
          >
            {upload.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("avatar.save")}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Diálogo IRMÃO, não aninhado dentro do DialogContent acima: dois
          DialogContent na mesma árvore disputam o foco e o scroll-lock do Radix, e o
          de dentro herda o `max-w` do de fora. Como irmãos do mesmo <Dialog> raiz,
          cada um controla o seu próprio estado.
          
          Mesma forma do tela cheia do comprovante: sm:max-w-3xl com object-contain,
          que aqui é o certo — ampliar é para VER a foto inteira, ao contrário do
          avatar, onde cover recorta para preencher o círculo. */}
      {current?.url && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>{t("avatar.fullscreenDescription")}</DialogDescription>
            </DialogHeader>
            <img
              src={current.url}
              alt={name}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
