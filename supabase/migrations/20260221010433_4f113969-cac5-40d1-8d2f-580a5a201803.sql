-- Auto-assign admin role to owner on signup
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'beeetbock@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_owner_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_owner_role();

-- Create table for visitor analytics
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  page text NOT NULL DEFAULT '/',
  visitor_hash text
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (anonymous tracking)
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);

-- Only admins can read visits
CREATE POLICY "Admins can read visits" ON public.site_visits FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete visits
CREATE POLICY "Admins can delete visits" ON public.site_visits FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));