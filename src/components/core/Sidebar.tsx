import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/useAuth";
import { initialsFromName, usernameFromEmail } from "@/lib/profile";
import { NAV_ITEMS } from "./nav-items";

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <Sidebar collapsible="icon">
      {/* h-17.5 matches Topbar's header height so the two bottom borders line
          up across the sidebar/topbar seam. */}
      <SidebarHeader
        className="h-17.5 flex-row items-center gap-3 border-b border-sidebar-border p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2"
      >
        {user && (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initialsFromName(user.name)}
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{usernameFromEmail(user.email)}</span>
            </span>
          </>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {/* pl-2 (not translate-x-2) shifts the icon right: translate repaints
              content without moving the layout box, so the hover background
              (tied to the box) stayed put and left an unhighlighted strip on
              the left. Padding moves the box itself, so hover now fills the
              row. In the collapsed/icon rail, the shrunk 32px button has no
              internal slack to redistribute (its own p-2! padding already
              centers a 16px icon exactly) — what needs centering is the whole
              button *within* the wider 48px rail, so that centering belongs
              on the row (SidebarMenuItem), not inside the button. */}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.to}  className="h-17.5 flex items-center group-data-[collapsible=icon]:justify-center">
                {item.enabled ? (
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={item.label} className="pl-2 hover:bg-accent! h-full hover:text-accent-foreground! dark:hover:bg-accent/50!" >
                    <Link to={item.to} className=" bg-sidebar!">
                      <Icon aria-hidden />
                      <span >{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <div className=" flex items-center justify-between w-full h-full pl-2">
                    <SidebarMenuButton type="button" disabled tooltip={item.label} className=" w-fit">
                      <Icon aria-hidden />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="pr-5 text-sidebar-ring ">em breve</SidebarMenuBadge>
                  </div>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" onClick={handleLogout} tooltip="Sair">
              <LogOut aria-hidden />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
