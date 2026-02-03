-- HUBSS Database Schema
-- Migration 001: Initial Schema
-- 24 tables for the complete collaboration platform

-- =====================
-- ENUMS
-- =====================

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

-- =====================
-- CORE TABLES
-- =====================

-- Workspaces (multi-tenant support)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar TEXT,
    avatar_config JSONB, -- AvatarConfig object
    status user_status DEFAULT 'offline',
    role VARCHAR(100), -- Links to role name
    accessible_clients UUID[] DEFAULT '{}', -- Client IDs this user can access
    settings JSONB DEFAULT '{}',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members (junction table for multi-workspace support)
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID, -- References roles table
    is_owner BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Roles (custom role definitions per workspace)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions TEXT[] DEFAULT '{}', -- Array of permission IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Permissions (granular permission definitions)
CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'manage_projects', 'edit_tasks'
    label VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL -- 'General', 'Projects', 'Clients', 'Team'
);

-- =====================
-- PROJECT MANAGEMENT TABLES
-- =====================

-- Boards (Kanban boards)
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID, -- Optional link to client
    columns JSONB DEFAULT '[]', -- Array of BoardColumn objects
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board Members (who can access which boards)
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
    status VARCHAR(100) NOT NULL, -- Column ID or title
    priority task_priority DEFAULT 'Medium',
    due_date DATE,
    tags TEXT[] DEFAULT '{}',
    checklist JSONB DEFAULT '[]', -- Array of ChecklistItem objects
    cover VARCHAR(50), -- Hex color
    client_visible BOOLEAN DEFAULT FALSE,
    effort INTEGER, -- Estimated hours
    actual_effort INTEGER, -- Actual hours spent
    is_blocked BOOLEAN DEFAULT FALSE,
    rework_count INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    total_time_spent BIGINT DEFAULT 0, -- milliseconds
    position INTEGER DEFAULT 0, -- For ordering within column
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignees (many-to-many)
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
    parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE, -- For nested comments
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Logs
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ, -- NULL if currently running
    duration BIGINT DEFAULT 0, -- milliseconds
    description TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CLIENT TABLES
-- =====================

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Contact name
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar TEXT,
    project VARCHAR(255), -- Current main project
    status client_status DEFAULT 'active',
    owner_id UUID REFERENCES profiles(id), -- Team member who manages this client
    settings JSONB DEFAULT '{}',
    last_access TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Client Access (who can see which clients)
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
    size_display VARCHAR(50), -- e.g., "2.3 MB"
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CHAT TABLES
-- =====================

-- Channels
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type channel_type DEFAULT 'channel',
    category VARCHAR(100), -- e.g., "Workspace", "Clients", "Direct Messages"
    description TEXT,
    avatar TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- For client channels
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel Members (for private channels and DMs)
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
    thread_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- Parent message for threads
    reply_count INTEGER DEFAULT 0,
    reactions JSONB DEFAULT '[]', -- Array of Reaction objects
    pinned BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]', -- Array of attachment objects
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reads (read receipts)
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- =====================
-- DOCUMENTS TABLE
-- =====================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    icon VARCHAR(50) DEFAULT 'FileText',
    blocks JSONB DEFAULT '[]', -- Array of Block objects
    parent_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- For nested docs
    is_template BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    last_edited_by UUID REFERENCES profiles(id),
    last_edited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- OTHER TABLES
-- =====================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'task_assigned', 'mention', 'comment', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}', -- Additional context (task_id, board_id, etc.)
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations (OAuth tokens for third-party apps)
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- 'google', 'github', 'slack', etc.
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

-- Call Sessions
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
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    entity_type VARCHAR(100) NOT NULL, -- 'task', 'board', 'client', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================

-- Profiles
CREATE INDEX idx_profiles_workspace ON profiles(workspace_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);

-- Workspace Members
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Boards
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_client ON boards(client_id);

-- Board Members
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);

-- Tasks
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_position ON tasks(board_id, status, position);

-- Task Assignees
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- Time Logs
CREATE INDEX idx_time_logs_task ON time_logs(task_id);
CREATE INDEX idx_time_logs_user ON time_logs(user_id);
CREATE INDEX idx_time_logs_running ON time_logs(user_id) WHERE end_time IS NULL;

-- Clients
CREATE INDEX idx_clients_workspace ON clients(workspace_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_owner ON clients(owner_id);

-- User Client Access
CREATE INDEX idx_user_client_access_user ON user_client_access(user_id);
CREATE INDEX idx_user_client_access_client ON user_client_access(client_id);

-- Channels
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_client ON channels(client_id);

-- Channel Members
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);

-- Messages
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_pinned ON messages(channel_id) WHERE pinned = TRUE;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- Audit Logs
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
