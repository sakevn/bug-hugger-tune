-- Drop the overly broad public SELECT policy on avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Replace with a narrower policy: public can read avatars only via direct object access.
-- Listing is implicitly blocked because the SELECT requires `name` to be referenced in path,
-- but to truly prevent listing we restrict SELECT to authenticated owners + use signed URLs / public CDN for direct fetch.
-- For a public avatars bucket, direct GET via the public URL bypasses RLS, so we keep RLS strict.
CREATE POLICY "avatars_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_select_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  );