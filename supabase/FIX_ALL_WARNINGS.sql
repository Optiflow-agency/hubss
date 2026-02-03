-- =============================================================================
-- FIX ALL SECURITY WARNINGS - FUNCTION SEARCH PATH
-- =============================================================================
-- Esegui questo nel SQL Editor di Supabase:
-- https://supabase.com/dashboard/project/boggskauypdcltvkfaij/sql/new
-- =============================================================================

-- Helper functions
ALTER FUNCTION public.is_workspace_member(UUID) SET search_path = public;
ALTER FUNCTION public.is_workspace_admin(UUID) SET search_path = public;
ALTER FUNCTION public.has_permission(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.has_client_access(UUID) SET search_path = public;
ALTER FUNCTION public.is_board_member(UUID) SET search_path = public;
ALTER FUNCTION public.is_channel_member(UUID) SET search_path = public;

-- Trigger functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.calculate_time_log_duration() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.handle_manual_time_log() SET search_path = public;

-- Board/Channel auto-add creator
ALTER FUNCTION public.add_board_creator_as_member() SET search_path = public;
ALTER FUNCTION public.add_channel_creator_as_member() SET search_path = public;

-- Notification functions
ALTER FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID) SET search_path = public;
ALTER FUNCTION public.notify_task_assignment() SET search_path = public;

-- Workspace functions
ALTER FUNCTION public.get_current_workspace() SET search_path = public;
ALTER FUNCTION public.create_default_roles() SET search_path = public;
ALTER FUNCTION public.on_workspace_created() SET search_path = public;
ALTER FUNCTION public.create_default_channels() SET search_path = public;
ALTER FUNCTION public.setup_new_workspace(UUID, UUID) SET search_path = public;

-- Time log functions
ALTER FUNCTION public.get_running_time_log() SET search_path = public;
ALTER FUNCTION public.stop_running_time_logs() SET search_path = public;

-- Message functions
ALTER FUNCTION public.get_unread_count() SET search_path = public;

-- =============================================================================
-- ABILITA REALTIME SULLE TABELLE
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;

-- =============================================================================
-- DONE! Refresh Security Advisor per verificare che i warning siano spariti
-- =============================================================================
