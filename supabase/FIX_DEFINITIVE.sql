-- =============================================================================
-- FIX DEFINITIVE - Risolve TUTTI i warning di sicurezza rimanenti
-- =============================================================================
-- Questo file e' IDEMPOTENTE: puo' essere eseguito piu' volte senza problemi.
-- Risolve:
--   1. SET search_path su TUTTE le 23 funzioni SECURITY DEFINER
--   2. Policy INSERT per audit_logs (mancante)
--   3. Policy INSERT per notifications (riscritta correttamente)
-- =============================================================================

-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  PARTE 1: SET search_path su TUTTE le funzioni SECURITY DEFINER ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ── 002_rls_policies.sql: 6 funzioni helper ──

DO $$ BEGIN
  ALTER FUNCTION public.is_workspace_member(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.has_permission(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_workspace_admin(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.has_client_access(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_board_member(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_channel_member(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ── 003_triggers.sql: 12 funzioni trigger/utility ──

DO $$ BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.add_workspace_owner() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.add_board_creator_as_member() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.add_channel_creator_as_member() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.log_audit_event() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) - firma esatta da 003_triggers.sql:321
DO $$ BEGIN
  ALTER FUNCTION public.create_notification(UUID, VARCHAR, VARCHAR, TEXT, JSONB) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.notify_task_assignment() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.notify_mention() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_current_workspace() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_running_time_log() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.stop_running_time_logs() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_unread_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ── 004_storage.sql: 1 funzione ──

DO $$ BEGIN
  ALTER FUNCTION public.get_signed_url(TEXT, TEXT, INTEGER) SET search_path = public, storage;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ── 005_seed_data.sql: 4 funzioni setup workspace ──

DO $$ BEGIN
  ALTER FUNCTION public.create_default_roles(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.on_workspace_created() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.create_default_channels(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- setup_new_workspace(VARCHAR, VARCHAR) - firma esatta da 005_seed_data.sql:201
DO $$ BEGIN
  ALTER FUNCTION public.setup_new_workspace(VARCHAR, VARCHAR) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  PARTE 2: Fix notifications INSERT policy                        ║
-- ╚═══════════════════════════════════════════════════════════════════╝
-- Problema: la policy originale "Create notifications" era troppo permissiva.
-- Le notifiche vengono create SOLO da trigger SECURITY DEFINER (che bypassano RLS).
-- Per sicurezza, permettiamo INSERT solo se:
--   - L'utente inserisce una notifica per se stesso (user_id = auth.uid())
--   - OPPURE la funzione create_notification() lo fa (SECURITY DEFINER bypassa)

DROP POLICY IF EXISTS "Create notifications" ON notifications;

CREATE POLICY "Create notifications" ON notifications
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  PARTE 3: Aggiunta audit_logs INSERT policy (mancante)           ║
-- ╚═══════════════════════════════════════════════════════════════════╝
-- I log di audit vengono creati dalla funzione trigger log_audit_event()
-- che e' SECURITY DEFINER e quindi bypassa RLS automaticamente.
-- Aggiungiamo comunque una policy INSERT per:
--   - Permettere insert diretti da parte di admin/owner del workspace
--   - Il trigger SECURITY DEFINER continua a funzionare senza policy

DROP POLICY IF EXISTS "Insert audit logs" ON audit_logs;

CREATE POLICY "Insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        -- Solo admin/owner possono inserire direttamente
        -- (i trigger SECURITY DEFINER bypassano questa policy)
        workspace_id IS NOT NULL
        AND is_workspace_admin(workspace_id)
    );

-- Aggiungiamo anche una policy per permettere agli utenti di vedere i propri log
DROP POLICY IF EXISTS "Users view own audit logs" ON audit_logs;

CREATE POLICY "Users view own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
    );


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  PARTE 4: Verifica                                               ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- Conta le funzioni SECURITY DEFINER ancora senza search_path
DO $$
DECLARE
    count_missing INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_missing
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (p.proconfig IS NULL OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS c WHERE c LIKE 'search_path=%'
      ));

    IF count_missing > 0 THEN
        RAISE NOTICE '⚠️  Ancora % funzioni SECURITY DEFINER senza search_path!', count_missing;
    ELSE
        RAISE NOTICE '✅ Tutte le funzioni SECURITY DEFINER hanno search_path impostato!';
    END IF;
END $$;

SELECT 'FIX DEFINITIVE applicato con successo!' AS result;
