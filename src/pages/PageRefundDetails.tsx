import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import Skeleton from "../components/atoms/Skeleton";
import Button from "../components/molecules/Button";
import InputText from "../components/molecules/InputText";
import {
  Dialog,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "../components/molecules/Dialog";
import DialogContent from "../components/molecules/Dialog";
import ReceiptIcon from "../assets/icons/Receipt.svg?react";
import { CATEGORIES } from "../constants/categories";
import { formatCentsToBRL } from "../lib/format";
import { getApiErrorMessage, getReceiptUrl } from "../lib/api";
import { useRefund } from "../hooks/useRefund";
import { useDeleteRefund } from "../hooks/useDeleteRefund";

export default function PageRefundDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: refund, isLoading, isError } = useRefund(id);
  const { mutateAsync: deleteRefund, isPending: isDeleting } = useDeleteRefund();

  async function handleConfirmDelete() {
    if (!id) return;
    setDeleteError(null);
    try {
      await deleteRefund(id);
      setIsDeleteOpen(false);
      navigate("/");
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-500 flex justify-center py-10 px-4">
      <div className="max-w-[512px] w-full h-fit bg-white rounded-lg p-8 flex flex-col gap-4">
        <div>
          <Text as="h1" variant="heading-medium">
            Solicitação de reembolso
          </Text>
          <Text variant="paragraph-medium" className="text-gray-200">
            Dados da despesa para solicitar reembolso.
          </Text>
        </div>

        {isError && (
          <Text variant="paragraph-medium" className="text-error text-center py-4">
            Não foi possível encontrar essa solicitação.
          </Text>
        )}

        {isLoading && (
          <>
            <Skeleton className="w-full h-12" />
            <div className="flex gap-4">
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
            </div>
            <Skeleton className="w-32 h-5 mx-auto" />
          </>
        )}

        {refund && !isLoading && (
          <>
            <InputText label="Nome da solicitação" value={refund.name} readOnly />

            <div className="flex gap-4">
              <InputText label="Categoria" value={CATEGORIES[refund.category].label} readOnly />
              <InputText
                label="Valor"
                value={formatCentsToBRL(refund.amount_in_cents)}
                readOnly
              />
            </div>

            <a
              href={getReceiptUrl(refund.filename)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon svg={ReceiptIcon} className="w-5 h-5 fill-green-100" />
              <Text variant="label-medium" className="text-green-100">
                Abrir comprovante
              </Text>
            </a>

            <Button variant="primary" className="w-full" onClick={() => setIsDeleteOpen(true)}>
              Excluir
            </Button>
          </>
        )}
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent aria-describedby={undefined}>
          <div className="flex flex-col gap-4">
            <DialogTitle asChild>
              <Text as="h2" variant="heading-medium">
                Excluir solicitação
              </Text>
            </DialogTitle>
            <DialogDescription asChild>
              <Text variant="paragraph-medium" className="text-gray-200">
                Tem certeza que deseja excluir essa solicitação? Essa ação é irreversível.
              </Text>
            </DialogDescription>
            {deleteError && (
              <Text variant="paragraph-medium" className="text-error">
                {deleteError}
              </Text>
            )}
            <div className="flex items-center justify-end gap-4">
              <DialogClose asChild>
                <button type="button" className="cursor-pointer">
                  <Text variant="label-medium" className="text-green-100">
                    Cancelar
                  </Text>
                </button>
              </DialogClose>
              <Button
                variant="primary"
                size="fit"
                onClick={handleConfirmDelete}
                handling={isDeleting}
                disabled={isDeleting}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
