-- ============================================================================
-- HUBSS COMPLETE DATABASE SETUP
-- ============================================================================
-- Copia TUTTO questo file e incollalo nel SQL Editor di Supabase
-- https://supabase.com/dashboard/project/boggskauypdcltvkfaij/sql/new
-- Poi clicca "Run"
-- ============================================================================


-- ============================================================================
-- PARTE 1: ENUMS E TABELLE
-- ============================================================================

CREATE TYPE user_status AS ENUM ('online', 'busy', 'offline', 'away');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE client_status AS ENUM ('active', 'pending', 'completed', 'archived');
CREATE TYPE channel_type AS ENUM ('channel', 'dm', 'ai');
CREATE TYPE ticket_type AS ENUM ('Domanda', 'Modifica', 'Bug', 'Feature');
CREATE TYPE ticket_status AS ENUM ('Ricevuta', 'In Lavorazione', 'Completata');
CREATE TYPE milestone_status AS ENUM ('completed', 'in_progress', 'pending');
CREATE TYPE attachment_type AS ENUM ('image', 'file');
CREATE TYPE file_type AS ENUM ('pdf', 'img', 'doc', 'zip');
CREATE TYPE call_type AS ENUM ('audio', 'video');
CREATE TYPE call_status AS ENUM ('dialing', 'connected', 'ended');

-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar TEXT,
    avatar_config JSONB,
    status user_status DEFAULT 'offline',
    role VARCHAR(100),
    accessible_clients UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID,
    is_owner BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Permissions
CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL
);

-- Boards
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID,
    columns JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board Members
CREATE TABLE board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(100) NOT NULL,
    priority task_priority DEFAULT 'Medium',
    due_date DATE,
    tags TEXT[] DEFAULT '{}',
    checklist JSONB DEFAULT '[]',
    cover VARCHAR(50),
    client_visible BOOLEAN DEFAULT FALSE,
    effort INTEGER,
    actual_effort INTEGER,
    is_blocked BOOLEAN DEFAULT FALSE,
    rework_count INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    total_time_spent BIGINT DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignees
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Task Attachments
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type attachment_type NOT NULL,
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Logs
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration BIGINT DEFAULT 0,
    description TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar TEXT,
    project VARCHAR(255),
    status client_status DEFAULT 'active',
    owner_id UUID REFERENCES profiles(id),
    settings JSONB DEFAULT '{}',
    last_access TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Client Access
CREATE TABLE user_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES profiles(id),
    UNIQUE(user_id, client_id)
);

-- Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status milestone_status DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    type ticket_type NOT NULL,
    status ticket_status DEFAULT 'Ricevuta',
    priority task_priority DEFAULT 'Medium',
    assigned_to UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Files
CREATE TABLE client_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type file_type NOT NULL,
    url TEXT NOT NULL,
    size_bytes BIGINT,
    size_display VARCHAR(50),
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type channel_type DEFAULT 'channel',
    category VARCHAR(100),
    description TEXT,
    avatar TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Members
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_muted BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    reply_count INTEGER DEFAULT 0,
    reactions JSONB DEFAULT '[]',
    pinned BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reads
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    icon VARCHAR(50) DEFAULT 'FileText',
    blocks JSONB DEFAULT '[]',
    parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    last_edited_by UUID REFERENCES profiles(id),
    last_edited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    connected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, provider)
);

-- Calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type call_type NOT NULL,
    status call_status DEFAULT 'dialing',
    started_by UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER
);

-- Call Participants
CREATE TABLE call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_muted BOOLEAN DEFAULT FALSE,
    is_video_off BOOLEAN DEFAULT FALSE,
    UNIQUE(call_id, user_id)
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PARTE 2: INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_workspace ON profiles(workspace_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_client ON boards(client_id);
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_position ON tasks(board_id, status, position);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX idx_time_logs_task ON time_logs(task_id);
CREATE INDEX idx_time_logs_user ON time_logs(user_id);
CREATE INDEX idx_time_logs_running ON time_logs(user_id) WHERE end_time IS NULL;
CREATE INDEX idx_clients_workspace ON clients(workspace_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_owner ON clients(owner_id);
CREATE INDEX idx_user_client_access_user ON user_client_access(user_id);
CREATE INDEX idx_user_client_access_client ON user_client_access(client_id);
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_client ON channels(client_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_pinned ON messages(channel_id) WHERE pinned = TRUE;
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- PARTE 3: ENABLE RLS
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 4: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(ws_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_id UUID;
    role_perms TEXT[];
BEGIN
    SELECT role_id INTO user_role_id
    FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid();
    IF user_role_id IS NULL THEN RETURN FALSE; END IF;
    SELECT permissions INTO role_perms FROM roles WHERE id = user_role_id;
    RETURN permission_name = ANY(role_perms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND (is_admin = TRUE OR is_owner = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_client_access(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_client_access WHERE client_id = c_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF;
    IF EXISTS (SELECT 1 FROM clients WHERE id = c_id AND owner_id = auth.uid()) THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM clients c
        JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
        WHERE c.id = c_id AND wm.user_id = auth.uid() AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_board_member(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM board_members WHERE board_id = b_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM boards b
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
        WHERE b.id = b_id AND wm.user_id = auth.uid() AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_channel_member(ch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    channel_rec RECORD;
BEGIN
    SELECT * INTO channel_rec FROM channels WHERE id = ch_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF channel_rec.is_private = FALSE THEN RETURN is_workspace_member(channel_rec.workspace_id); END IF;
    IF EXISTS (SELECT 1 FROM channel_members WHERE channel_id = ch_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF;
    IF channel_rec.client_id IS NOT NULL THEN RETURN has_client_access(channel_rec.client_id); END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 5: RLS POLICIES
-- ============================================================================

-- Workspaces
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT USING (is_workspace_member(id));
CREATE POLICY "Owners can update workspace" ON workspaces FOR UPDATE USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = id AND user_id = auth.uid() AND is_owner = TRUE));
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles
CREATE POLICY "View profiles in same workspace" ON profiles FOR SELECT USING (id = auth.uid() OR EXISTS (SELECT 1 FROM workspace_members wm1 JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Workspace Members
CREATE POLICY "View workspace members" ON workspace_members FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can add members" ON workspace_members FOR INSERT WITH CHECK (is_workspace_admin(workspace_id));
CREATE POLICY "Admins can update members" ON workspace_members FOR UPDATE USING (is_workspace_admin(workspace_id));
CREATE POLICY "Admins can remove members" ON workspace_members FOR DELETE USING (is_workspace_admin(workspace_id) OR user_id = auth.uid());

-- Roles
CREATE POLICY "View workspace roles" ON roles FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can create roles" ON roles FOR INSERT WITH CHECK (is_workspace_admin(workspace_id));
CREATE POLICY "Admins can update roles" ON roles FOR UPDATE USING (is_workspace_admin(workspace_id) AND is_system = FALSE);
CREATE POLICY "Admins can delete roles" ON roles FOR DELETE USING (is_workspace_admin(workspace_id) AND is_system = FALSE);

-- Permissions
CREATE POLICY "Anyone can read permissions" ON permissions FOR SELECT USING (TRUE);

-- Boards
CREATE POLICY "View boards as member" ON boards FOR SELECT USING (is_board_member(id));
CREATE POLICY "Create boards with permission" ON boards FOR INSERT WITH CHECK (is_workspace_admin(workspace_id) OR has_permission(workspace_id, 'manage_projects'));
CREATE POLICY "Update boards as member" ON boards FOR UPDATE USING (is_board_member(id) AND (is_workspace_admin(workspace_id) OR EXISTS (SELECT 1 FROM board_members WHERE board_id = id AND user_id = auth.uid() AND can_edit = TRUE)));
CREATE POLICY "Admins can delete boards" ON boards FOR DELETE USING (is_workspace_admin(workspace_id));

-- Board Members
CREATE POLICY "View board members" ON board_members FOR SELECT USING (is_board_member(board_id));
CREATE POLICY "Admins can add board members" ON board_members FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_workspace_admin(b.workspace_id)));
CREATE POLICY "Admins can update board members" ON board_members FOR UPDATE USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_workspace_admin(b.workspace_id)));
CREATE POLICY "Admins can remove board members" ON board_members FOR DELETE USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_workspace_admin(b.workspace_id)) OR user_id = auth.uid());

-- Tasks
CREATE POLICY "View tasks as board member" ON tasks FOR SELECT USING (is_board_member(board_id));
CREATE POLICY "Create tasks as board member" ON tasks FOR INSERT WITH CHECK (is_board_member(board_id) AND EXISTS (SELECT 1 FROM board_members WHERE board_id = tasks.board_id AND user_id = auth.uid() AND can_edit = TRUE));
CREATE POLICY "Update tasks as board member" ON tasks FOR UPDATE USING (is_board_member(board_id) AND EXISTS (SELECT 1 FROM board_members WHERE board_id = tasks.board_id AND user_id = auth.uid() AND can_edit = TRUE));
CREATE POLICY "Admins can delete tasks" ON tasks FOR DELETE USING (EXISTS (SELECT 1 FROM boards b WHERE b.id = board_id AND is_workspace_admin(b.workspace_id)));

-- Task Assignees
CREATE POLICY "View task assignees" ON task_assignees FOR SELECT USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Manage task assignees" ON task_assignees FOR INSERT WITH CHECK (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Remove task assignees" ON task_assignees FOR DELETE USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

-- Task Attachments
CREATE POLICY "View task attachments" ON task_attachments FOR SELECT USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Upload task attachments" ON task_attachments FOR INSERT WITH CHECK (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Delete own attachments" ON task_attachments FOR DELETE USING (uploaded_by = auth.uid());

-- Task Comments
CREATE POLICY "View task comments" ON task_comments FOR SELECT USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Create task comments" ON task_comments FOR INSERT WITH CHECK (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)) AND user_id = auth.uid());
CREATE POLICY "Update own comments" ON task_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Delete own comments" ON task_comments FOR DELETE USING (user_id = auth.uid());

-- Time Logs
CREATE POLICY "View time logs" ON time_logs FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM tasks t JOIN boards b ON b.id = t.board_id WHERE t.id = task_id AND (is_workspace_admin(b.workspace_id) OR has_permission(b.workspace_id, 'manage_time'))));
CREATE POLICY "Create own time logs" ON time_logs FOR INSERT WITH CHECK (user_id = auth.uid() AND is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));
CREATE POLICY "Update own time logs" ON time_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Delete own time logs" ON time_logs FOR DELETE USING (user_id = auth.uid());

-- Clients
CREATE POLICY "View accessible clients" ON clients FOR SELECT USING (has_client_access(id));
CREATE POLICY "Create clients" ON clients FOR INSERT WITH CHECK (is_workspace_admin(workspace_id) OR has_permission(workspace_id, 'manage_projects'));
CREATE POLICY "Update clients" ON clients FOR UPDATE USING (is_workspace_admin(workspace_id) OR owner_id = auth.uid());
CREATE POLICY "Delete clients" ON clients FOR DELETE USING (is_workspace_admin(workspace_id));

-- User Client Access
CREATE POLICY "View client access" ON user_client_access FOR SELECT USING (user_id = auth.uid() OR has_client_access(client_id));
CREATE POLICY "Grant client access" ON user_client_access FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND (is_workspace_admin(c.workspace_id) OR c.owner_id = auth.uid())));
CREATE POLICY "Revoke client access" ON user_client_access FOR DELETE USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND (is_workspace_admin(c.workspace_id) OR c.owner_id = auth.uid())));

-- Milestones
CREATE POLICY "View milestones" ON milestones FOR SELECT USING (has_client_access(client_id));
CREATE POLICY "Manage milestones" ON milestones FOR INSERT WITH CHECK (has_client_access(client_id));
CREATE POLICY "Update milestones" ON milestones FOR UPDATE USING (has_client_access(client_id));
CREATE POLICY "Delete milestones" ON milestones FOR DELETE USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND is_workspace_admin(c.workspace_id)));

-- Tickets
CREATE POLICY "View tickets" ON tickets FOR SELECT USING (has_client_access(client_id));
CREATE POLICY "Create tickets" ON tickets FOR INSERT WITH CHECK (has_client_access(client_id) AND created_by = auth.uid());
CREATE POLICY "Update tickets" ON tickets FOR UPDATE USING (has_client_access(client_id));
CREATE POLICY "Delete tickets" ON tickets FOR DELETE USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND is_workspace_admin(c.workspace_id)));

-- Client Files
CREATE POLICY "View client files" ON client_files FOR SELECT USING (has_client_access(client_id));
CREATE POLICY "Upload client files" ON client_files FOR INSERT WITH CHECK (has_client_access(client_id) AND uploaded_by = auth.uid());
CREATE POLICY "Delete own client files" ON client_files FOR DELETE USING (uploaded_by = auth.uid());

-- Channels
CREATE POLICY "View channels" ON channels FOR SELECT USING (is_channel_member(id));
CREATE POLICY "Create channels" ON channels FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Update channels" ON channels FOR UPDATE USING (is_channel_member(id));
CREATE POLICY "Delete channels" ON channels FOR DELETE USING (is_workspace_admin(workspace_id));

-- Channel Members
CREATE POLICY "View channel members" ON channel_members FOR SELECT USING (is_channel_member(channel_id));
CREATE POLICY "Join channels" ON channel_members FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND (c.is_private = FALSE OR is_workspace_admin(c.workspace_id))));
CREATE POLICY "Update channel membership" ON channel_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Leave channels" ON channel_members FOR DELETE USING (user_id = auth.uid());

-- Messages
CREATE POLICY "View messages" ON messages FOR SELECT USING (is_channel_member(channel_id));
CREATE POLICY "Send messages" ON messages FOR INSERT WITH CHECK (is_channel_member(channel_id) AND sender_id = auth.uid());
CREATE POLICY "Edit own messages" ON messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Delete own messages" ON messages FOR DELETE USING (sender_id = auth.uid());

-- Message Reads
CREATE POLICY "View read receipts" ON message_reads FOR SELECT USING (is_channel_member((SELECT channel_id FROM messages WHERE id = message_id)));
CREATE POLICY "Mark as read" ON message_reads FOR INSERT WITH CHECK (user_id = auth.uid());

-- Documents
CREATE POLICY "View documents" ON documents FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Create documents" ON documents FOR INSERT WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());
CREATE POLICY "Update documents" ON documents FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Delete documents" ON documents FOR DELETE USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- Notifications
CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create notifications" ON notifications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Delete own notifications" ON notifications FOR DELETE USING (user_id = auth.uid());

-- Integrations
CREATE POLICY "View own integrations" ON integrations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create integrations" ON integrations FOR INSERT WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));
CREATE POLICY "Update own integrations" ON integrations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Delete own integrations" ON integrations FOR DELETE USING (user_id = auth.uid());

-- Calls
CREATE POLICY "View calls" ON calls FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Start calls" ON calls FOR INSERT WITH CHECK (is_workspace_member(workspace_id) AND started_by = auth.uid());
CREATE POLICY "Update calls" ON calls FOR UPDATE USING (EXISTS (SELECT 1 FROM call_participants WHERE call_id = id AND user_id = auth.uid()));

-- Call Participants
CREATE POLICY "View call participants" ON call_participants FOR SELECT USING (EXISTS (SELECT 1 FROM calls c WHERE c.id = call_id AND is_workspace_member(c.workspace_id)));
CREATE POLICY "Join calls" ON call_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own participation" ON call_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Leave calls" ON call_participants FOR DELETE USING (user_id = auth.uid());

-- Audit Logs
CREATE POLICY "View audit logs" ON audit_logs FOR SELECT USING (is_workspace_admin(workspace_id));

-- ============================================================================
-- PARTE 6: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Time Log Duration
CREATE OR REPLACE FUNCTION calculate_time_log_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) * 1000;
        UPDATE tasks SET total_time_spent = total_time_spent + NEW.duration WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_log_duration_trigger BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION calculate_time_log_duration();

CREATE OR REPLACE FUNCTION handle_manual_time_log()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_manual = TRUE AND NEW.duration > 0 THEN
        UPDATE tasks SET total_time_spent = total_time_spent + NEW.duration WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_manual_time_log_trigger AFTER INSERT ON time_logs FOR EACH ROW EXECUTE FUNCTION handle_manual_time_log();

-- Message Reply Count
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.thread_id IS NOT NULL THEN
        UPDATE messages SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' AND OLD.thread_id IS NOT NULL THEN
        UPDATE messages SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.thread_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reply_count_on_insert AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();
CREATE TRIGGER update_reply_count_on_delete AFTER DELETE ON messages FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();

-- New User Profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name, avatar)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Workspace Owner
CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, is_owner, is_admin)
    VALUES (NEW.id, auth.uid(), TRUE, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_workspace_owner_trigger AFTER INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION add_workspace_owner();

-- Board Creator
CREATE OR REPLACE FUNCTION add_board_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO board_members (board_id, user_id, can_edit) VALUES (NEW.id, NEW.created_by, TRUE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_board_creator_trigger AFTER INSERT ON boards FOR EACH ROW EXECUTE FUNCTION add_board_creator_as_member();

-- Channel Creator
CREATE OR REPLACE FUNCTION add_channel_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO channel_members (channel_id, user_id) VALUES (NEW.id, NEW.created_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_channel_creator_trigger AFTER INSERT ON channels FOR EACH ROW EXECUTE FUNCTION add_channel_creator_as_member();

-- Notification Helper
CREATE OR REPLACE FUNCTION create_notification(p_user_id UUID, p_type VARCHAR, p_title VARCHAR, p_body TEXT DEFAULT NULL, p_data JSONB DEFAULT '{}')
RETURNS UUID AS $$
DECLARE notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user_id, p_type, p_title, p_body, p_data) RETURNING id INTO notification_id;
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Task Assignment Notification
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE task_rec RECORD;
BEGIN
    SELECT t.*, b.title as board_title INTO task_rec FROM tasks t JOIN boards b ON b.id = t.board_id WHERE t.id = NEW.task_id;
    IF NEW.user_id != auth.uid() THEN
        PERFORM create_notification(NEW.user_id, 'task_assigned', 'Nuova attività assegnata', 'Ti è stata assegnata l''attività "' || task_rec.title || '" in ' || task_rec.board_title, jsonb_build_object('task_id', NEW.task_id, 'board_id', task_rec.board_id));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_task_assignment AFTER INSERT ON task_assignees FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

-- Utility Functions
CREATE OR REPLACE FUNCTION get_current_workspace() RETURNS UUID AS $$
DECLARE ws_id UUID;
BEGIN
    SELECT workspace_id INTO ws_id FROM profiles WHERE id = auth.uid();
    RETURN ws_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_running_time_log() RETURNS SETOF time_logs AS $$
BEGIN
    RETURN QUERY SELECT * FROM time_logs WHERE user_id = auth.uid() AND end_time IS NULL ORDER BY start_time DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION stop_running_time_logs() RETURNS INTEGER AS $$
DECLARE updated_count INTEGER;
BEGIN
    UPDATE time_logs SET end_time = NOW(), duration = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000 WHERE user_id = auth.uid() AND end_time IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_count(p_channel_id UUID) RETURNS INTEGER AS $$
DECLARE last_read TIMESTAMPTZ; unread INTEGER;
BEGIN
    SELECT last_read_at INTO last_read FROM channel_members WHERE channel_id = p_channel_id AND user_id = auth.uid();
    SELECT COUNT(*) INTO unread FROM messages WHERE channel_id = p_channel_id AND created_at > COALESCE(last_read, '1970-01-01'::TIMESTAMPTZ) AND sender_id != auth.uid();
    RETURN unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 7: SEED DATA (Permissions)
-- ============================================================================

INSERT INTO permissions (id, label, description, category) VALUES
    ('view_workspace', 'Visualizza Workspace', 'Può visualizzare le informazioni del workspace', 'General'),
    ('manage_workspace', 'Gestisci Workspace', 'Può modificare le impostazioni del workspace', 'General'),
    ('invite_members', 'Invita Membri', 'Può invitare nuovi membri al workspace', 'General'),
    ('manage_roles', 'Gestisci Ruoli', 'Può creare e modificare i ruoli', 'General'),
    ('view_audit_logs', 'Visualizza Audit Log', 'Può visualizzare lo storico delle attività', 'General'),
    ('view_projects', 'Visualizza Progetti', 'Può visualizzare tutti i progetti', 'Projects'),
    ('manage_projects', 'Gestisci Progetti', 'Può creare, modificare e archiviare progetti', 'Projects'),
    ('delete_projects', 'Elimina Progetti', 'Può eliminare definitivamente i progetti', 'Projects'),
    ('view_tasks', 'Visualizza Task', 'Può visualizzare le attività dei progetti', 'Projects'),
    ('edit_tasks', 'Modifica Task', 'Può creare e modificare attività', 'Projects'),
    ('delete_tasks', 'Elimina Task', 'Può eliminare attività', 'Projects'),
    ('assign_tasks', 'Assegna Task', 'Può assegnare attività ai membri', 'Projects'),
    ('manage_time', 'Gestisci Tempo', 'Può visualizzare e modificare i time log di tutti', 'Projects'),
    ('view_clients', 'Visualizza Clienti', 'Può visualizzare i clienti assegnati', 'Clients'),
    ('manage_clients', 'Gestisci Clienti', 'Può creare e modificare clienti', 'Clients'),
    ('delete_clients', 'Elimina Clienti', 'Può eliminare clienti', 'Clients'),
    ('manage_tickets', 'Gestisci Ticket', 'Può gestire i ticket di supporto', 'Clients'),
    ('share_files', 'Condividi File', 'Può caricare e condividere file con i clienti', 'Clients'),
    ('view_team', 'Visualizza Team', 'Può visualizzare i membri del team', 'Team'),
    ('manage_team', 'Gestisci Team', 'Può modificare ruoli e permessi dei membri', 'Team'),
    ('remove_members', 'Rimuovi Membri', 'Può rimuovere membri dal workspace', 'Team'),
    ('view_reports', 'Visualizza Report', 'Può accedere ai report e analytics', 'Team');

-- ============================================================================
-- PARTE 8: WORKSPACE SETUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_roles(ws_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO roles (workspace_id, name, description, is_system, permissions) VALUES (ws_id, 'Admin', 'Accesso completo a tutte le funzionalità', TRUE, ARRAY(SELECT id FROM permissions));
    INSERT INTO roles (workspace_id, name, description, is_system, permissions) VALUES (ws_id, 'Project Manager', 'Gestione progetti, task e clienti', FALSE, ARRAY['view_workspace', 'invite_members', 'view_projects', 'manage_projects', 'view_tasks', 'edit_tasks', 'delete_tasks', 'assign_tasks', 'manage_time', 'view_clients', 'manage_clients', 'manage_tickets', 'share_files', 'view_team', 'view_reports']);
    INSERT INTO roles (workspace_id, name, description, is_system, permissions) VALUES (ws_id, 'Developer', 'Sviluppo e gestione task tecnici', FALSE, ARRAY['view_workspace', 'view_projects', 'view_tasks', 'edit_tasks', 'assign_tasks', 'view_clients', 'view_team']);
    INSERT INTO roles (workspace_id, name, description, is_system, permissions) VALUES (ws_id, 'Designer', 'Design e condivisione asset', FALSE, ARRAY['view_workspace', 'view_projects', 'view_tasks', 'edit_tasks', 'view_clients', 'share_files', 'view_team']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION on_workspace_created() RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_roles(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_workspace_default_roles AFTER INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION on_workspace_created();

CREATE OR REPLACE FUNCTION create_default_channels(ws_id UUID, creator_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by) VALUES (ws_id, 'generale', 'channel', 'Workspace', 'Canale generale del team', FALSE, creator_id);
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by) VALUES (ws_id, 'annunci', 'channel', 'Workspace', 'Annunci e comunicazioni importanti', FALSE, creator_id);
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by) VALUES (ws_id, 'random', 'channel', 'Workspace', 'Conversazioni informali', FALSE, creator_id);
    INSERT INTO channels (workspace_id, name, type, category, description, is_private, created_by) VALUES (ws_id, 'AI Assistant', 'ai', 'AI', 'Assistente AI per domande e supporto', FALSE, creator_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION setup_new_workspace(p_name VARCHAR, p_slug VARCHAR) RETURNS UUID AS $$
DECLARE new_workspace_id UUID; admin_role_id UUID;
BEGIN
    INSERT INTO workspaces (name, slug) VALUES (p_name, p_slug) RETURNING id INTO new_workspace_id;
    SELECT id INTO admin_role_id FROM roles WHERE workspace_id = new_workspace_id AND name = 'Admin';
    UPDATE workspace_members SET role_id = admin_role_id WHERE workspace_id = new_workspace_id AND user_id = auth.uid();
    UPDATE profiles SET workspace_id = new_workspace_id, role = 'Admin' WHERE id = auth.uid();
    PERFORM create_default_channels(new_workspace_id, auth.uid());
    RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 9: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('workspace-logos', 'workspace-logos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('task-attachments', 'task-attachments', FALSE, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'application/x-zip-compressed', 'text/plain', 'text/csv']);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('client-files', 'client-files', FALSE, 104857600, NULL);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('chat-attachments', 'chat-attachments', FALSE, 26214400, NULL);

-- Storage Policies
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "Public workspace logo access" ON storage.objects FOR SELECT USING (bucket_id = 'workspace-logos');
CREATE POLICY "Admins can upload workspace logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workspace-logos' AND is_workspace_admin((storage.foldername(name))[1]::UUID));
CREATE POLICY "Admins can update workspace logo" ON storage.objects FOR UPDATE USING (bucket_id = 'workspace-logos' AND is_workspace_admin((storage.foldername(name))[1]::UUID));
CREATE POLICY "Admins can delete workspace logo" ON storage.objects FOR DELETE USING (bucket_id = 'workspace-logos' AND is_workspace_admin((storage.foldername(name))[1]::UUID));
CREATE POLICY "Board members can view task attachments" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments' AND is_board_member((storage.foldername(name))[2]::UUID));
CREATE POLICY "Board members can upload task attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND is_board_member((storage.foldername(name))[2]::UUID) AND EXISTS (SELECT 1 FROM board_members WHERE board_id = (storage.foldername(name))[2]::UUID AND user_id = auth.uid() AND can_edit = TRUE));
CREATE POLICY "Users can delete own task attachments" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments' AND is_board_member((storage.foldername(name))[2]::UUID));
CREATE POLICY "Client access users can view files" ON storage.objects FOR SELECT USING (bucket_id = 'client-files' AND has_client_access((storage.foldername(name))[2]::UUID));
CREATE POLICY "Client access users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-files' AND has_client_access((storage.foldername(name))[2]::UUID));
CREATE POLICY "Users can update own client files" ON storage.objects FOR UPDATE USING (bucket_id = 'client-files' AND has_client_access((storage.foldername(name))[2]::UUID));
CREATE POLICY "Users can delete client files with access" ON storage.objects FOR DELETE USING (bucket_id = 'client-files' AND has_client_access((storage.foldername(name))[2]::UUID));
CREATE POLICY "Channel members can view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments' AND is_channel_member((storage.foldername(name))[2]::UUID));
CREATE POLICY "Channel members can upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND is_channel_member((storage.foldername(name))[2]::UUID));
CREATE POLICY "Users can delete own chat attachments" ON storage.objects FOR DELETE USING (bucket_id = 'chat-attachments' AND is_channel_member((storage.foldername(name))[2]::UUID));

-- ============================================================================
-- PARTE 10: REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;

-- ============================================================================
-- FINE! Database pronto per HUBSS
-- ============================================================================
