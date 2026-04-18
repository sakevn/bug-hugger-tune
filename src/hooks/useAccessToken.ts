import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get accessToken and create authenticated data wrapper
 */
export function useAccessToken() {
  const getAccessToken = useCallback(async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Bạn cần đăng nhập để thực hiện thao tác này");
    }
    return session.access_token;
  }, []);

  /**
   * Wraps data with accessToken for authenticated server function calls
   */
  const withAuth = useCallback(async <T extends Record<string, unknown>>(data: T): Promise<T & { accessToken: string }> => {
    const accessToken = await getAccessToken();
    return { ...data, accessToken };
  }, [getAccessToken]);

  return { getAccessToken, withAuth };
}
