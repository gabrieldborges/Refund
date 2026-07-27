import { Sidebar as ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Link, useLocation, useNavigate } from "react-router";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "@/context/useAuth";
import { useUiStore } from "@/stores/ui";
import { initialsFromName, usernameFromEmail } from "@/lib/profile";
import { NAV_ITEMS } from "./nav-items";

interface SidebarProps {
  toggled: boolean;
  onBackdropClick: () => void;
}

export default function Sidebar({ toggled, onBackdropClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <ProSidebar
      collapsed={collapsed}
      toggled={toggled}
      onBackdropClick={onBackdropClick}
      breakPoint="md"
      backgroundColor="var(--surface)"
      rootStyles={{ color: "var(--content)", borderColor: "var(--line)" }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4 border-b border-line">
          {!collapsed && user && (
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center text-sm font-semibold shrink-0">
                {initialsFromName(user.name)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-content truncate">{user.name}</span>
                <span className="block text-xs text-muted truncate">{usernameFromEmail(user.email)}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="text-muted cursor-pointer flex items-center"
          >
            {collapsed ? (
              <ChevronRightIcon aria-hidden fontSize="small" />
            ) : (
              <ChevronLeftIcon aria-hidden fontSize="small" />
            )}
          </button>
        </div>

        <Menu
          menuItemStyles={{
            button: ({ active, disabled }) => ({
              color: disabled ? "var(--muted)" : "var(--content)",
              backgroundColor: active ? "var(--accent-soft)" : undefined,
              opacity: disabled ? 0.6 : 1,
              "&:hover": { backgroundColor: disabled ? undefined : "var(--subtle)" },
            }),
          }}
        >
          {NAV_ITEMS.map((item) =>
            item.enabled ? (
              <MenuItem
                key={item.to}
                icon={item.icon}
                active={location.pathname === item.to}
                component={<Link to={item.to} />}
              >
                {item.label}
              </MenuItem>
            ) : (
              <MenuItem
                key={item.to}
                icon={item.icon}
                disabled
                suffix={
                  collapsed ? undefined : (
                    <span className="text-[10px] uppercase text-muted">em breve</span>
                  )
                }
              >
                {item.label}
              </MenuItem>
            ),
          )}
        </Menu>

        <div className="mt-auto p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-content hover:bg-subtle cursor-pointer"
          >
            <LogoutIcon aria-hidden fontSize="small" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </div>
    </ProSidebar>
  );
}
