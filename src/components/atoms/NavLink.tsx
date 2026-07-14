import { Link } from "react-router";
import { useLocation } from "react-router";
import Text from "./Text";

export default function NavLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link to={to} className={isActive ? "text-gray-200" : "text-green-100"}>
      <Text variant="label-medium">{children}</Text>
    </Link>
  );
}
