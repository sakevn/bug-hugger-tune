import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công, đang đăng nhập…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-6 sm:p-8 shadow-card"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 font-display font-bold">
            <span className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs">VIN</span>
            VinSight Scan
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Đăng nhập để truy cập bảng điều khiển và API keys
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>
          <form onSubmit={submit} className="space-y-4 mt-6">
            <TabsContent value="signup" className="m-0 space-y-4">
              <div>
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
            </TabsContent>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tab === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
            {tab === "signin" && (
              <div className="text-center">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            )}
            {tab === "signup" && (
              <p className="text-[11px] text-muted-foreground text-center">
                Người dùng đầu tiên đăng ký sẽ tự động trở thành admin.
              </p>
            )}
          </form>
        </Tabs>
      </motion.div>
    </div>
  );
}
