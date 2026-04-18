import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, ScanLine, KeyRound, Shield, LayoutDashboard, Code2, UserCog, Car } from "lucide-react";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, avatarUrl, displayName, signOut } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const links = [
    { to: "/dashboard", label: "Quét VIN", icon: ScanLine },
    { to: "/dashboard/vehicles", label: "Tài sản", icon: Car },
    { to: "/dashboard/keys", label: "API Keys", icon: KeyRound },
    { to: "/dashboard/docs", label: "Tài liệu API", icon: Code2 },
    { to: "/dashboard/profile", label: "Hồ sơ", icon: UserCog },
  ] as const;

  const adminLinks = [
    { to: "/admin", label: "Người dùng", icon: LayoutDashboard },
    { to: "/admin/keys", label: "Quản lý keys", icon: KeyRound },
    { to: "/admin/logs", label: "Logs", icon: Shield },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="h-7 w-7 rounded-md bg-gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">VIN</span>
            <span className="hidden sm:inline">VinSight Scan</span>
          </Link>
          <nav className="flex items-center gap-1 ml-auto overflow-x-auto">
            {links.map((l) => {
              const active = loc.pathname === l.to || (l.to === "/dashboard" && loc.pathname === "/dashboard/");
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{l.label}</span>
                </Link>
              );
            })}
            {role === "admin" &&
              adminLinks.map((l) => {
                const active = loc.pathname.startsWith(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors border border-transparent ${
                      active
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <l.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{l.label}</span>
                  </Link>
                );
              })}
          </nav>
          <div className="flex items-center gap-2 border-l border-border/60 pl-3">
            <Link to="/dashboard/profile" className="flex items-center gap-2 group">
              <Avatar className="h-7 w-7 border border-border/60 group-hover:border-primary transition-colors">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
                <AvatarFallback className="text-[10px]">
                  {(displayName || user?.email || "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs text-muted-foreground hidden sm:block max-w-[140px] truncate group-hover:text-foreground">
                {displayName || user?.email}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                nav({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
