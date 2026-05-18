
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM public, anon, authenticated;

ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;
