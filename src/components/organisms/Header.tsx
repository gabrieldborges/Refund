import { Link, useNavigate } from "react-router";
import Text from "../atoms/Text";
import Icon from "../atoms/Icon";
import Button from "../molecules/Button";
import NavLink from "../../components/atoms/NavLink";
import ReceiptIcon from "../../assets/icons/Receipt.svg?react";
import { useAuth } from "../../context/useAuth";

interface HeaderProps {
  onNewRefund: () => void;
}

export default function Header({ onNewRefund }: HeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="w-full bg-white border-b border-gray-300 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
      <Link to="/" className="flex items-center gap-2">
        <Icon svg={ReceiptIcon} className="w-6 h-6 fill-green-100" />
        <Text variant="heading-medium" className="text-green-100">
          refund
        </Text>
      </Link>

      <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
        {/* Some no mobile: é redundante com o título da própria página, e
            "Nova solicitação"/"Sair" já cabem melhor sozinhos no espaço estreito. */}
        <div className="hidden sm:block">
          <NavLink to="/">Solicitações de reembolso</NavLink>
        </div>
        <Button variant="primary" size="fit" onClick={onNewRefund}>
          Nova solicitação
        </Button>
        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer"
        >
          <Text variant="label-medium" className="text-gray-200 hover:text-error transition">
            Sair
          </Text>
        </button>
      </div>
    </header>
  );
}
