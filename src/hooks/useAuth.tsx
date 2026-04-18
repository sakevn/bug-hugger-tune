import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  loading: true,
  avatarUrl: null,
  displayName: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  async function fetchRole(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (data?.some((r) => r.role === "admin")) setRole("admin");
    else setRole("user");
  }

  async function fetchProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", uid)
      .maybeSingle();
    setAvatarUrl(data?.avatar_url ?? null);
    setDisplayName(data?.display_name ?? null);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          fetchRole(s.user.id);
          fetchProfile(s.user.id);
        }, 0);
      } else {
        setRole(null);
        setAvatarUrl(null);
        setDisplayName(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Promise.all([fetchRole(s.user.id), fetchProfile(s.user.id)]).finally(() => setLoading(false));
      } else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        loading,
        avatarUrl,
        displayName,
        refreshProfile: async () => { if (user) await fetchProfile(user.id); },
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
