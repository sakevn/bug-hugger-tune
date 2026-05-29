import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  ScanLine,
  KeyRound,
  Shield,
  LayoutDashboard,
  Code2,
  UserCog,
  Car,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

type NavItem = { to: string; label: string; icon: typeof ScanLine };

const userGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Bảng điều khiển",
    items: [{ to: "/dashboard", label: "Quét VIN", icon: ScanLine }],
  },
  {
    label: "Quản lý",
    items: [
      { to: "/dashboard/vehicles", label: "Tài sản", icon: Car },
      { to: "/dashboard/kyc", label: "KYC", icon: ShieldCheck },
    ],
  },
  {
    label: "Nhà phát triển",
    items: [
      { to: "/dashboard/keys", label: "API Keys", icon: KeyRound },
      { to: "/dashboard/docs", label: "Tài liệu API", icon: Code2 },
    ],
  },
  {
    label: "Tài khoản",
    items: [{ to: "/dashboard/profile", label: "Hồ sơ", icon: UserCog }],
  },
];

const adminItems: NavItem[] = [
  { to: "/admin", label: "Người dùng", icon: LayoutDashboard },
  { to: "/admin/keys", label: "Quản lý keys", icon: KeyRound },
  { to: "/admin/logs", label: "Logs", icon: Shield },
];

function crumbFor(pathname: string): string {
  const all = [...userGroups.flatMap((g) => g.items), ...adminItems];
  const match = all
    .filter((i) => pathname === i.to || pathname.startsWith(i.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? "Bảng điều khiển";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, avatarUrl, displayName, signOut } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const isActive = (to: string) =>
    loc.pathname === to ||
    (to !== "/dashboard" && to !== "/admin" && loc.pathname.startsWith(to + "/"));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2.5 px-2 py-2 font-display font-bold">
              <span className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                VIN
              </span>
              <span className="text-sm tracking-tight group-data-[collapsible=icon]:hidden">
                VinSight Scan
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-1 py-2">
            {userGroups.map((g) => (
              <SidebarGroup key={g.label}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                  {g.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((it) => (
                      <SidebarMenuItem key={it.to}>
                        <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label}>
                          <Link to={it.to} className="flex items-center gap-2.5">
                            <it.icon className="h-4 w-4" />
                            <span>{it.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {role === "admin" && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-destructive/80">
                  Quản trị
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((it) => (
                      <SidebarMenuItem key={it.to}>
                        <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label}>
                          <Link to={it.to} className="flex items-center gap-2.5">
                            <it.icon className="h-4 w-4" />
                            <span>{it.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-2 p-1.5">
              <Link to="/dashboard/profile" className="flex items-center gap-2 flex-1 min-w-0 group">
                <Avatar className="h-8 w-8 border border-sidebar-border group-hover:border-primary transition-colors shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
                  <AvatarFallback className="text-[10px]">
                    {(displayName || user?.email || "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <div className="text-xs font-medium truncate">{displayName || "Tài khoản"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 group-data-[collapsible=icon]:hidden"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/auth" });
                }}
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30 px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
              <span>Lovable</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <span className="text-foreground font-medium truncate">{crumbFor(loc.pathname)}</span>
            </div>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
