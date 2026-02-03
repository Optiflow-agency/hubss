-- FIX FUNCTION SEARCH PATH WARNINGS
-- Esegui questo nel SQL Editor di Supabase

ALTER FUNCTION public.notify_task_assignment() SET search_path = public;
ALTER FUNCTION public.get_current_workspace() SET search_path = public;
ALTER FUNCTION public.get_running_time_log() SET search_path = public;
ALTER FUNCTION public.stop_running_time_logs() SET search_path = public;
ALTER FUNCTION public.get_unread_count() SET search_path = public;
ALTER FUNCTION public.create_default_roles() SET search_path = public;
ALTER FUNCTION public.on_workspace_created() SET search_path = public;
ALTER FUNCTION public.create_default_channels() SET search_path = public;
ALTER FUNCTION public.setup_new_workspace(UUID, UUID) SET search_path = public;

-- Fix anche le altre funzioni helper
ALTER FUNCTION public.is_workspace_member(UUID) SET search_path = public;
ALTER FUNCTION public.is_workspace_admin(UUID) SET search_path = public;
ALTER FUNCTION public.has_permission(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.has_client_access(UUID) SET search_path = public;
ALTER FUNCTION public.is_board_member(UUID) SET search_path = public;
ALTER FUNCTION public.is_channel_member(UUID) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.calculate_time_log_duration() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
