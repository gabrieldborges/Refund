import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REFUND_STATUS, STATUS_FILTER_ORDER } from "../constants/status";
import type { RefundStatus } from "../schemas/refund";

// O Radix Select recusa um SelectItem com value="" (string vazia é o valor
// "sem seleção" dele), então "todos" precisa de um valor próprio. Ele existe
// só dentro deste componente: a prop de saída é `undefined`, que é o que a
// URL e a API entendem por "sem filtro".
const EVERY_STATUS = "all";

interface RefundsToolbarProps {
  status: RefundStatus | undefined;
  onStatusChange: (status: RefundStatus | undefined) => void;
}

export default function RefundsToolbar({ status, onStatusChange }: RefundsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="refund-status-filter" className="sr-only">
        Filtrar por status
      </Label>
      <Select
        value={status ?? EVERY_STATUS}
        onValueChange={(value) =>
          onStatusChange(value === EVERY_STATUS ? undefined : (value as RefundStatus))
        }
      >
        <SelectTrigger id="refund-status-filter" aria-label="Filtrar por status" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERY_STATUS}>Todos</SelectItem>
          {STATUS_FILTER_ORDER.map((value) => (
            <SelectItem key={value} value={value}>
              {REFUND_STATUS[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
