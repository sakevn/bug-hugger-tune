import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Đã gửi email đặt lại mật khẩu");
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
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Quay lại đăng nhập
        </Link>
        <div className="text-center mb-6">
          <Mail className="h-8 w-8 mx-auto text-primary mb-2" />
          <h1 className="font-display text-xl font-bold">Quên mật khẩu?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập email để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {sent ? (
          <div className="text-center text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-md p-4">
            Vui lòng kiểm tra hộp thư <span className="font-semibold text-foreground">{email}</span> và nhấn vào liên kết để đặt lại mật khẩu.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gửi liên kết đặt lại
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
