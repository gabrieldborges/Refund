import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
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
import { CATEGORIES, type RefundCategory } from "../constants/categories";
import { formatCentsToBRL } from "../lib/format";

// Mock só pra esta etapa (layout + navegação). Na sub-fase de API isso vira
// um GET /refunds/:id real, e o Excluir chama DELETE /refunds/:id de verdade.
interface MockRefundDetails {
  name: string;
  category: RefundCategory;
  amount_in_cents: number;
}

const MOCK_REFUND: MockRefundDetails = {
  name: "Rodrigo",
  category: "food",
  amount_in_cents: 3478,
};

export default function PageRefundDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const category = CATEGORIES[MOCK_REFUND.category];

  function handleConfirmDelete() {
    setIsDeleteOpen(false);
    navigate("/");
  }

  return (
    <div className="w-full min-h-screen bg-gray-500 flex justify-center py-10 px-4">
      <div className="max-w-[512px] w-full h-fit bg-white rounded-lg p-8 flex flex-col gap-4">
        <div>
          <Text as="h1" variant="heading-medium">
            Solicitação de reembolso
          </Text>
          <Text variant="paragraph-medium" className="text-gray-200">
            Dados da despesa para solicitar reembolso. (id: {id})
          </Text>
        </div>

        <InputText label="Nome da solicitação" value={MOCK_REFUND.name} readOnly />

        <div className="flex gap-4">
          <InputText label="Categoria" value={category.label} readOnly/>
          <InputText
            label="Valor"
            value={formatCentsToBRL(MOCK_REFUND.amount_in_cents)}
            readOnly
          />
        </div>

        <button type="button" className="flex items-center justify-center gap-2 cursor-pointer">
          <Icon svg={ReceiptIcon} className="w-5 h-5 fill-green-100" />
          <Text variant="label-medium" className="text-green-100">
            Abrir comprovante
          </Text>
        </button>

        <Button variant="primary" className="w-full" onClick={() => setIsDeleteOpen(true)}>
          Excluir
        </Button>
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
            <div className="flex items-center justify-end gap-4">
              <DialogClose asChild>
                <button type="button" className="cursor-pointer">
                  <Text variant="label-medium" className="text-green-100">
                    Cancelar
                  </Text>
                </button>
              </DialogClose>
              <Button variant="primary" size="fit" onClick={handleConfirmDelete}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
