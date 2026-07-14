import { Link } from "react-router";
import Text from "../atoms/Text";
import Icon from "../atoms/Icon";
import Button from "../molecules/Button";
import NavLink from "../../components/atoms/NavLink";
import ReceiptIcon from "../../assets/icons/Receipt.svg?react";

export default function Header() {
  return (
    <header className="w-full h-16 bg-white border-b border-gray-300 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2">
        <Icon svg={ReceiptIcon} className="w-6 h-6 fill-green-100" />
        <Text variant="heading-medium" className="text-green-100">
          refund
        </Text>
      </Link>

      <div className="flex items-center gap-6">
        <NavLink to="/">Solicitações de reembolso</NavLink>
        {/* Sem onClick por enquanto: abrir o modal de "Nova solicitação" é
            trabalho da sub-fase de contexts, não desta etapa de layout. */}
        <Button variant="primary" size="fit">
          Nova solicitação
        </Button>
      </div>
    </header>
  );
}
