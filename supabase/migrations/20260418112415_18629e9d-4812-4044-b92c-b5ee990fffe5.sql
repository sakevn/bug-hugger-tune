-- 1. RESTRICTIVE policy: only admin can write to user_roles, regardless of other PERMISSIVE policies
CREATE POLICY "user_roles_write_admin_only" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Harden has_role: explicit NULL check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. decode_logs: allow user to insert their own log entries
CREATE POLICY "decode_logs_insert_own" ON public.decode_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);