
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  full_name text,
  email text,
  phone text,
  document_type text,
  country text,
  risk_score integer,
  verification_url text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY kyc_select_own ON public.kyc_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY kyc_select_admin ON public.kyc_verifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kyc_insert_own ON public.kyc_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_kyc_user ON public.kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON public.kyc_verifications(status);

CREATE TRIGGER kyc_touch_updated BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'unverified';
