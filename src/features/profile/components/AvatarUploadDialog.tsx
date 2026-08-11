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

        <div className="flex items-center gap-4">
          {/* A foto atual, no mesmo componente que o resto da aplicação usa: se ela
              renderizar errado aqui, renderiza errado em todo lugar. */}
          <UserAvatar userId={userId} name={name} className="size-16" />
          <div className="min-w-0 flex-1">
            <InputFile accept={AVATAR_ACCEPT} onChange={handleChange} disabled={isBusy} />
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

        <DialogFooter className="gap-2 sm:justify-between">
          {/* Remover só existe quando há o que remover: um botão que apaga nada é um
              botão que só pode dar erro. */}
          {current?.url ? (
            <Button
              type="button"
              variant="outline"
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
          ) : (
            <span />
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
    </Dialog>
  );
}
