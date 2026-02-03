-- =============================================================================
-- FIX ALL SECURITY WARNINGS V2
-- =============================================================================

-- Helper functions
DO $$ BEGIN ALTER FUNCTION public.is_workspace_member(UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_workspace_admin(UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.has_permission(UUID, TEXT) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.has_client_access(UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_board_member(UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.is_channel_member(UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Trigger functions
DO $$ BEGIN ALTER FUNCTION public.update_updated_at_column() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.calculate_time_log_duration() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = public, auth; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.handle_manual_time_log() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Board/Channel auto-add creator
DO $$ BEGIN ALTER FUNCTION public.add_board_creator_as_member() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.add_channel_creator_as_member() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Notification functions
DO $$ BEGIN ALTER FUNCTION public.notify_task_assignment() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Workspace functions
DO $$ BEGIN ALTER FUNCTION public.get_current_workspace() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_default_roles() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.on_workspace_created() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.create_default_channels() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.setup_new_workspace(UUID, UUID) SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Time log functions
DO $$ BEGIN ALTER FUNCTION public.get_running_time_log() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN ALTER FUNCTION public.stop_running_time_logs() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Message functions
DO $$ BEGIN ALTER FUNCTION public.get_unread_count() SET search_path = public; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- =============================================================================
-- ABILITA REALTIME (ignora errori se già abilitato)
-- =============================================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tasks; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- DONE!
-- =============================================================================
SELECT 'All fixes applied successfully!' as result;
