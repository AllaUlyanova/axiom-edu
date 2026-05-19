CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_display_name text;
BEGIN
  safe_display_name := nullif(trim(coalesce(NEW.raw_user_meta_data->>'display_name', '')), '');

  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    coalesce(safe_display_name, split_part(coalesce(NEW.email, ''), '@', 1), 'Ученик')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = coalesce(public.profiles.display_name, EXCLUDED.display_name),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;