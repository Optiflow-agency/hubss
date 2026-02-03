-- =============================================================================
-- FIX FINAL 7 WARNINGS
-- =============================================================================

-- Queste funzioni hanno signature specifiche, le fixiamo direttamente

-- 1. get_unread_count (prende channel_id UUID)
ALTER FUNCTION public.get_unread_count(UUID) SET search_path = public;

-- 2. create_default_roles (prende workspace_id UUID)
ALTER FUNCTION public.create_default_roles(UUID) SET search_path = public;

-- 3. create_default_channels (prende workspace_id UUID)
ALTER FUNCTION public.create_default_channels(UUID) SET search_path = public;

-- 4. setup_new_workspace (prende workspace_id UUID, owner_id UUID)
ALTER FUNCTION public.setup_new_workspace(UUID, UUID) SET search_path = public;

-- 5. add_workspace_owner - trigger function (no params)
ALTER FUNCTION public.add_workspace_owner() SET search_path = public;

-- 6. create_notification (workspace_id, user_id, type, title, message, reference_id)
ALTER FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID) SET search_path = public;

-- 7. update_message_reply_count - trigger function (no params)
ALTER FUNCTION public.update_message_reply_count() SET search_path = public;

SELECT 'Done! Refresh Security Advisor' as result;
