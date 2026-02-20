
-- Tighten access_codes policies
DROP POLICY "Anyone can read unused codes" ON public.access_codes;
DROP POLICY "Anyone can update codes" ON public.access_codes;

-- Only allow reading own unused codes or via edge function (service role)
CREATE POLICY "Anon can read codes by code value" ON public.access_codes FOR SELECT USING (is_used = false AND expires_at > now());
CREATE POLICY "Authenticated can claim codes" ON public.access_codes FOR UPDATE TO authenticated USING (is_used = false AND expires_at > now()) WITH CHECK (used_by = auth.uid() AND is_used = true);
