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
    <header className="w-full h-16 bg-white border-b border-gray-300 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2">
        <Icon svg={ReceiptIcon} className="w-6 h-6 fill-green-100" />
        <Text variant="heading-medium" className="text-green-100">
          refund
        </Text>
      </Link>

      <div className="flex items-center gap-6">
        <NavLink to="/">Solicitações de reembolso</NavLink>
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
