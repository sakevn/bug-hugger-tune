-- Explicit deny-all for rate_limit_counters (only service role uses it)
CREATE POLICY "rate_limit_counters_no_access" ON public.rate_limit_counters
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);