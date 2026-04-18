import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, User, Lock, Camera, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <ProfilePage />
      </AppShell>
    </RequireAuth>
  ),
});

function ProfilePage() {
  const { user, avatarUrl, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setLoadingProfile(false);
    })();
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  }

  async function removeAvatar() {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Đã xoá ảnh đại diện");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Đã cập nhật tên hiển thị");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Đã đổi mật khẩu");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Hồ sơ của bạn</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý tên hiển thị và mật khẩu đăng nhập.</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" /> Ảnh đại diện
          </CardTitle>
          <CardDescription>JPG / PNG / WEBP, tối đa 5MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border border-border/60">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
              <AvatarFallback className="text-lg">
                {(displayName || user?.email || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Tải ảnh lên
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={uploadingAvatar}
                  onClick={removeAvatar}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Xoá ảnh
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Thông tin tài khoản
          </CardTitle>
          <CardDescription>Email: <span className="font-mono">{user?.email}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4">
            <div>
              <Label htmlFor="display_name">Tên hiển thị</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nguyễn Văn A"
                disabled={loadingProfile}
              />
            </div>
            <Button
              type="submit"
              disabled={savingName || loadingProfile}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {savingName && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu thay đổi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> Đổi mật khẩu
          </CardTitle>
          <CardDescription>Mật khẩu mới phải có ít nhất 6 ký tự.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <Label htmlFor="new_pwd">Mật khẩu mới</Label>
              <Input
                id="new_pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm_pwd">Xác nhận mật khẩu</Label>
              <Input
                id="confirm_pwd"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={savingPwd}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {savingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cập nhật mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
