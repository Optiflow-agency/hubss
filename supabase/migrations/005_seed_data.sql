-- HUBSS Seed Data
-- Migration 005: Default Permissions and System Data
-- Initial data required for the application to function

-- =====================
-- DEFAULT PERMISSIONS
-- =====================

INSERT INTO permissions (id, label, description, category) VALUES
    -- General Permissions
    ('view_workspace', 'Visualizza Workspace', 'Può visualizzare le informazioni del workspace', 'General'),
    ('manage_workspace', 'Gestisci Workspace', 'Può modificare le impostazioni del workspace', 'General'),
    ('invite_members', 'Invita Membri', 'Può invitare nuovi membri al workspace', 'General'),
    ('manage_roles', 'Gestisci Ruoli', 'Può creare e modificare i ruoli', 'General'),
    ('view_audit_logs', 'Visualizza Audit Log', 'Può visualizzare lo storico delle attività', 'General'),

    -- Project Permissions
    ('view_projects', 'Visualizza Progetti', 'Può visualizzare tutti i progetti', 'Projects'),
    ('manage_projects', 'Gestisci Progetti', 'Può creare, modificare e archiviare progetti', 'Projects'),
    ('delete_projects', 'Elimina Progetti', 'Può eliminare definitivamente i progetti', 'Projects'),
    ('view_tasks', 'Visualizza Task', 'Può visualizzare le attività dei progetti', 'Projects'),
    ('edit_tasks', 'Modifica Task', 'Può creare e modificare attività', 'Projects'),
    ('delete_tasks', 'Elimina Task', 'Può eliminare attività', 'Projects'),
    ('assign_tasks', 'Assegna Task', 'Può assegnare attività ai membri', 'Projects'),
    ('manage_time', 'Gestisci Tempo', 'Può visualizzare e modificare i time log di tutti', 'Projects'),

    -- Client Permissions
    ('view_clients', 'Visualizza Clienti', 'Può visualizzare i clienti assegnati', 'Clients'),
    ('manage_clients', 'Gestisci Clienti', 'Può creare e modificare clienti', 'Clients'),
    ('delete_clients', 'Elimina Clienti', 'Può eliminare clienti', 'Clients'),
    ('manage_tickets', 'Gestisci Ticket', 'Può gestire i ticket di supporto', 'Clients'),
    ('share_files', 'Condividi File', 'Può caricare e condividere file con i clienti', 'Clients'),

    -- Team Permissions
    ('view_team', 'Visualizza Team', 'Può visualizzare i membri del team', 'Team'),
    ('manage_team', 'Gestisci Team', 'Può modificare ruoli e permessi dei membri', 'Team'),
    ('remove_members', 'Rimuovi Membri', 'Può rimuovere membri dal workspace', 'Team'),
    ('view_reports', 'Visualizza Report', 'Può accedere ai report e analytics', 'Team');

-- =====================
-- DEFAULT ROLE TEMPLATES
-- =====================

-- Note: These are templates. Actual roles are created per-workspace.
-- This comment documents the recommended default roles.

-- Admin Role (full access)
-- Permissions: ALL

-- Project Manager Role
-- Permissions: view_workspace, invite_members, view_projects, manage_projects,
--              view_tasks, edit_tasks, delete_tasks, assign_tasks, manage_time,
--              view_clients, manage_clients, manage_tickets, share_files,
--              view_team, view_reports

-- Developer Role
-- Permissions: view_workspace, view_projects, view_tasks, edit_tasks, assign_tasks,
--              view_clients, view_team

-- Designer Role
-- Permissions: view_workspace, view_projects, view_tasks, edit_tasks,
--              view_clients, share_files, view_team

-- =====================
-- FUNCTION TO CREATE DEFAULT ROLES FOR NEW WORKSPACE
-- =====================

CREATE OR REPLACE FUNCTION create_default_roles(ws_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Admin role (system, cannot be deleted)
    INSERT INTO roles (workspace_id, name, description, is_system, permissions)
    VALUES (
        ws_id,
        'Admin',
        'Accesso completo a tutte le funzionalità',
        TRUE,
        ARRAY(SELECT id FROM permissions)
    );

    -- Project Manager role
    INSERT INTO roles (workspace_id, name, description, is_system, permissions)
    VALUES (
        ws_id,
        'Project Manager',
        'Gestione progetti, task e clienti',
        FALSE,
        ARRAY[
            'view_workspace', 'invite_members', 'view_projects', 'manage_projects',
            'view_tasks', 'edit_tasks', 'delete_tasks', 'assign_tasks', 'manage_time',
            'view_clients', 'manage_clients', 'manage_tickets', 'share_files',
            'view_team', 'view_reports'
        ]
    );

    -- Developer role
    INSERT INTO roles (workspace_id, name, description, is_system, permissions)
    VALUES (
        ws_id,
        'Developer',
        'Sviluppo e gestione task tecnici',
        FALSE,
        ARRAY[
            'view_workspace', 'view_projects', 'view_tasks', 'edit_tasks', 'assign_tasks',
            'view_clients', 'view_team'
        ]
    );

    -- Designer role
    INSERT INTO roles (workspace_id, name, description, is_system, permissions)
    VALUES (
        ws_id,
        'Designer',
        'Design e condivisione asset',
        FALSE,
        ARRAY[
            'view_workspace', 'view_projects', 'view_tasks', 'edit_tasks',
            'view_clients', 'share_files', 'view_team'
        ]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================
-- TRIGGER TO CREATE DEFAULT ROLES ON WORKSPACE CREATION
-- =====================

CREATE OR REPLACE FUNCTION on_workspace_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_roles(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_workspace_default_roles
    AFTER INSERT ON workspaces
    FOR EACH ROW EXECUTE FUNCTION on_workspace_created();

-- =====================
-- FUNCTION TO CREATE DEFAULT CHANNELS FOR NEW WORKSPACE
-- =====================

CREATE OR REPLACE FUNCTION create_default_channels(ws_id UUID, creator_id UUID)
RETURNS VOID AS $$
BEGIN
    -- General channel
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by)
    VALUES (
        ws_id,
        'generale',
        'channel',
        'Workspace',
        'Canale generale del team',
        FALSE,
        creator_id
    );

    -- Announcements channel
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by)
    VALUES (
        ws_id,
        'annunci',
        'channel',
        'Workspace',
        'Annunci e comunicazioni importanti',
        FALSE,
        creator_id
    );

    -- Random channel
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by)
    VALUES (
        ws_id,
        'random',
        'channel',
        'Workspace',
        'Conversazioni informali',
        FALSE,
        creator_id
    );

    -- AI Assistant channel
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by)
    VALUES (
        ws_id,
        'AI Assistant',
        'ai',
        'AI',
        'Assistente AI per domande e supporto',
        FALSE,
        creator_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================
-- FUNCTION TO SETUP NEW WORKSPACE COMPLETELY
-- =====================

CREATE OR REPLACE FUNCTION setup_new_workspace(
    p_name VARCHAR,
    p_slug VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_workspace_id UUID;
    admin_role_id UUID;
BEGIN
    -- Create workspace
    INSERT INTO workspaces (name, slug)
    VALUES (p_name, p_slug)
    RETURNING id INTO new_workspace_id;

    -- Get admin role ID
    SELECT id INTO admin_role_id
    FROM roles
    WHERE workspace_id = new_workspace_id AND name = 'Admin';

    -- Update workspace member with admin role
    UPDATE workspace_members
    SET role_id = admin_role_id
    WHERE workspace_id = new_workspace_id AND user_id = auth.uid();

    -- Update user's profile to link to this workspace
    UPDATE profiles
    SET workspace_id = new_workspace_id, role = 'Admin'
    WHERE id = auth.uid();

    -- Create default channels
    PERFORM create_default_channels(new_workspace_id, auth.uid());

    RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================
-- REALTIME CONFIGURATION
-- =====================

-- Enable realtime for key tables
-- Note: This requires Supabase Dashboard configuration or:

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
