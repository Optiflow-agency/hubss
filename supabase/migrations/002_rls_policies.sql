-- HUBSS Row Level Security Policies
-- Migration 002: RLS Policies
-- Complete security layer for all tables

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================

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

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Check if user is a workspace member
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user has a specific permission in a workspace
CREATE OR REPLACE FUNCTION has_permission(ws_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_id UUID;
    role_perms TEXT[];
BEGIN
    -- Get the user's role in this workspace
    SELECT role_id INTO user_role_id
    FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid();

    IF user_role_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if the role has this permission
    SELECT permissions INTO role_perms
    FROM roles
    WHERE id = user_role_id;

    RETURN permission_name = ANY(role_perms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is workspace admin or owner
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user has access to a client
CREATE OR REPLACE FUNCTION has_client_access(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check user_client_access table
    IF EXISTS (
        SELECT 1 FROM user_client_access
        WHERE client_id = c_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is the client owner
    IF EXISTS (
        SELECT 1 FROM clients
        WHERE id = c_id AND owner_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a workspace admin
    RETURN EXISTS (
        SELECT 1 FROM clients c
        JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
        WHERE c.id = c_id
        AND wm.user_id = auth.uid()
        AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is a board member
CREATE OR REPLACE FUNCTION is_board_member(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct board member
    IF EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = b_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Workspace admin can access all boards
    RETURN EXISTS (
        SELECT 1 FROM boards b
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
        WHERE b.id = b_id
        AND wm.user_id = auth.uid()
        AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is a channel member
CREATE OR REPLACE FUNCTION is_channel_member(ch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    channel_rec RECORD;
BEGIN
    SELECT * INTO channel_rec FROM channels WHERE id = ch_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Public channels are accessible to all workspace members
    IF channel_rec.is_private = FALSE THEN
        RETURN is_workspace_member(channel_rec.workspace_id);
    END IF;

    -- Private channels require explicit membership
    IF EXISTS (
        SELECT 1 FROM channel_members
        WHERE channel_id = ch_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Client channels require client access
    IF channel_rec.client_id IS NOT NULL THEN
        RETURN has_client_access(channel_rec.client_id);
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================
-- WORKSPACE POLICIES
-- =====================

-- Users can view workspaces they're members of
CREATE POLICY "Users can view own workspaces"
    ON workspaces FOR SELECT
    USING (is_workspace_member(id));

-- Only owners can update workspace settings
CREATE POLICY "Owners can update workspace"
    ON workspaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = id
            AND user_id = auth.uid()
            AND is_owner = TRUE
        )
    );

-- Anyone authenticated can create a workspace
CREATE POLICY "Users can create workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- PROFILE POLICIES
-- =====================

-- Users can view profiles of people in their workspace
CREATE POLICY "View profiles in same workspace"
    ON profiles FOR SELECT
    USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm1
            JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
            AND wm2.user_id = profiles.id
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Profile is created via trigger, but allow insert for setup
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- =====================
-- WORKSPACE MEMBERS POLICIES
-- =====================

-- View members of workspaces you belong to
CREATE POLICY "View workspace members"
    ON workspace_members FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Admins can add members
CREATE POLICY "Admins can add members"
    ON workspace_members FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

-- Admins can update member roles
CREATE POLICY "Admins can update members"
    ON workspace_members FOR UPDATE
    USING (is_workspace_admin(workspace_id));

-- Admins can remove members (or users can leave)
CREATE POLICY "Admins can remove members"
    ON workspace_members FOR DELETE
    USING (
        is_workspace_admin(workspace_id) OR
        user_id = auth.uid()
    );

-- =====================
-- ROLES POLICIES
-- =====================

-- View roles in your workspace
CREATE POLICY "View workspace roles"
    ON roles FOR SELECT
    USING (is_workspace_member(workspace_id));

-- Admins can manage roles
CREATE POLICY "Admins can create roles"
    ON roles FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update roles"
    ON roles FOR UPDATE
    USING (is_workspace_admin(workspace_id) AND is_system = FALSE);

CREATE POLICY "Admins can delete roles"
    ON roles FOR DELETE
    USING (is_workspace_admin(workspace_id) AND is_system = FALSE);

-- =====================
-- PERMISSIONS POLICIES
-- =====================

-- Everyone can read permissions (they're just definitions)
CREATE POLICY "Anyone can read permissions"
    ON permissions FOR SELECT
    USING (TRUE);

-- =====================
-- BOARD POLICIES
-- =====================

-- View boards you're a member of
CREATE POLICY "View boards as member"
    ON boards FOR SELECT
    USING (is_board_member(id));

-- Users with manage_projects permission can create boards
CREATE POLICY "Create boards with permission"
    ON boards FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id) OR
        has_permission(workspace_id, 'manage_projects')
    );

-- Board members can update (if they have edit permission)
CREATE POLICY "Update boards as member"
    ON boards FOR UPDATE
    USING (
        is_board_member(id) AND
        (is_workspace_admin(workspace_id) OR
         EXISTS (SELECT 1 FROM board_members WHERE board_id = id AND user_id = auth.uid() AND can_edit = TRUE))
    );

-- Admins can delete boards
CREATE POLICY "Admins can delete boards"
    ON boards FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- =====================
-- BOARD MEMBERS POLICIES
-- =====================

CREATE POLICY "View board members"
    ON board_members FOR SELECT
    USING (is_board_member(board_id));

CREATE POLICY "Admins can add board members"
    ON board_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards b
            WHERE b.id = board_id
            AND is_workspace_admin(b.workspace_id)
        )
    );

CREATE POLICY "Admins can update board members"
    ON board_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM boards b
            WHERE b.id = board_id
            AND is_workspace_admin(b.workspace_id)
        )
    );

CREATE POLICY "Admins can remove board members"
    ON board_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM boards b
            WHERE b.id = board_id
            AND is_workspace_admin(b.workspace_id)
        )
        OR user_id = auth.uid()
    );

-- =====================
-- TASK POLICIES
-- =====================

-- View tasks on boards you're a member of
CREATE POLICY "View tasks as board member"
    ON tasks FOR SELECT
    USING (is_board_member(board_id));

-- Board members with edit permission can create tasks
CREATE POLICY "Create tasks as board member"
    ON tasks FOR INSERT
    WITH CHECK (
        is_board_member(board_id) AND
        EXISTS (SELECT 1 FROM board_members WHERE board_id = tasks.board_id AND user_id = auth.uid() AND can_edit = TRUE)
    );

-- Board members with edit permission can update tasks
CREATE POLICY "Update tasks as board member"
    ON tasks FOR UPDATE
    USING (
        is_board_member(board_id) AND
        EXISTS (SELECT 1 FROM board_members WHERE board_id = tasks.board_id AND user_id = auth.uid() AND can_edit = TRUE)
    );

-- Admins can delete tasks
CREATE POLICY "Admins can delete tasks"
    ON tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM boards b
            WHERE b.id = board_id
            AND is_workspace_admin(b.workspace_id)
        )
    );

-- =====================
-- TASK ASSIGNEES POLICIES
-- =====================

CREATE POLICY "View task assignees"
    ON task_assignees FOR SELECT
    USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

CREATE POLICY "Manage task assignees"
    ON task_assignees FOR INSERT
    WITH CHECK (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

CREATE POLICY "Remove task assignees"
    ON task_assignees FOR DELETE
    USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

-- =====================
-- TASK ATTACHMENTS POLICIES
-- =====================

CREATE POLICY "View task attachments"
    ON task_attachments FOR SELECT
    USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

CREATE POLICY "Upload task attachments"
    ON task_attachments FOR INSERT
    WITH CHECK (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

CREATE POLICY "Delete own attachments"
    ON task_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- =====================
-- TASK COMMENTS POLICIES
-- =====================

CREATE POLICY "View task comments"
    ON task_comments FOR SELECT
    USING (is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

CREATE POLICY "Create task comments"
    ON task_comments FOR INSERT
    WITH CHECK (
        is_board_member((SELECT board_id FROM tasks WHERE id = task_id)) AND
        user_id = auth.uid()
    );

CREATE POLICY "Update own comments"
    ON task_comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Delete own comments"
    ON task_comments FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- TIME LOGS POLICIES
-- =====================

-- View own time logs or if you have manage_time permission
CREATE POLICY "View time logs"
    ON time_logs FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN boards b ON b.id = t.board_id
            WHERE t.id = task_id
            AND (is_workspace_admin(b.workspace_id) OR has_permission(b.workspace_id, 'manage_time'))
        )
    );

-- Users can create their own time logs
CREATE POLICY "Create own time logs"
    ON time_logs FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_board_member((SELECT board_id FROM tasks WHERE id = task_id)));

-- Users can update their own time logs
CREATE POLICY "Update own time logs"
    ON time_logs FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own time logs
CREATE POLICY "Delete own time logs"
    ON time_logs FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- CLIENT POLICIES
-- =====================

-- View clients you have access to
CREATE POLICY "View accessible clients"
    ON clients FOR SELECT
    USING (has_client_access(id));

-- Users with manage_projects permission can create clients
CREATE POLICY "Create clients"
    ON clients FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id) OR
        has_permission(workspace_id, 'manage_projects')
    );

-- Admins or owners can update clients
CREATE POLICY "Update clients"
    ON clients FOR UPDATE
    USING (
        is_workspace_admin(workspace_id) OR
        owner_id = auth.uid()
    );

-- Admins can delete clients
CREATE POLICY "Delete clients"
    ON clients FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- =====================
-- USER CLIENT ACCESS POLICIES
-- =====================

CREATE POLICY "View client access"
    ON user_client_access FOR SELECT
    USING (user_id = auth.uid() OR has_client_access(client_id));

CREATE POLICY "Grant client access"
    ON user_client_access FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id
            AND (is_workspace_admin(c.workspace_id) OR c.owner_id = auth.uid())
        )
    );

CREATE POLICY "Revoke client access"
    ON user_client_access FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id
            AND (is_workspace_admin(c.workspace_id) OR c.owner_id = auth.uid())
        )
    );

-- =====================
-- MILESTONE POLICIES
-- =====================

CREATE POLICY "View milestones"
    ON milestones FOR SELECT
    USING (has_client_access(client_id));

CREATE POLICY "Manage milestones"
    ON milestones FOR INSERT
    WITH CHECK (has_client_access(client_id));

CREATE POLICY "Update milestones"
    ON milestones FOR UPDATE
    USING (has_client_access(client_id));

CREATE POLICY "Delete milestones"
    ON milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id
            AND is_workspace_admin(c.workspace_id)
        )
    );

-- =====================
-- TICKET POLICIES
-- =====================

CREATE POLICY "View tickets"
    ON tickets FOR SELECT
    USING (has_client_access(client_id));

CREATE POLICY "Create tickets"
    ON tickets FOR INSERT
    WITH CHECK (has_client_access(client_id) AND created_by = auth.uid());

CREATE POLICY "Update tickets"
    ON tickets FOR UPDATE
    USING (has_client_access(client_id));

CREATE POLICY "Delete tickets"
    ON tickets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id
            AND is_workspace_admin(c.workspace_id)
        )
    );

-- =====================
-- CLIENT FILES POLICIES
-- =====================

CREATE POLICY "View client files"
    ON client_files FOR SELECT
    USING (has_client_access(client_id));

CREATE POLICY "Upload client files"
    ON client_files FOR INSERT
    WITH CHECK (has_client_access(client_id) AND uploaded_by = auth.uid());

CREATE POLICY "Delete own client files"
    ON client_files FOR DELETE
    USING (uploaded_by = auth.uid());

-- =====================
-- CHANNEL POLICIES
-- =====================

-- View channels in your workspace (respects privacy)
CREATE POLICY "View channels"
    ON channels FOR SELECT
    USING (is_channel_member(id));

-- Create channels in your workspace
CREATE POLICY "Create channels"
    ON channels FOR INSERT
    WITH CHECK (is_workspace_member(workspace_id));

-- Update channels you're a member of
CREATE POLICY "Update channels"
    ON channels FOR UPDATE
    USING (is_channel_member(id));

-- Admins can delete channels
CREATE POLICY "Delete channels"
    ON channels FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- =====================
-- CHANNEL MEMBERS POLICIES
-- =====================

CREATE POLICY "View channel members"
    ON channel_members FOR SELECT
    USING (is_channel_member(channel_id));

CREATE POLICY "Join channels"
    ON channel_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_id
            AND (c.is_private = FALSE OR is_workspace_admin(c.workspace_id))
        )
    );

CREATE POLICY "Update channel membership"
    ON channel_members FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Leave channels"
    ON channel_members FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- MESSAGE POLICIES
-- =====================

-- View messages in channels you're a member of
CREATE POLICY "View messages"
    ON messages FOR SELECT
    USING (is_channel_member(channel_id));

-- Send messages to channels you're a member of
CREATE POLICY "Send messages"
    ON messages FOR INSERT
    WITH CHECK (
        is_channel_member(channel_id) AND
        sender_id = auth.uid()
    );

-- Update own messages (for editing)
CREATE POLICY "Edit own messages"
    ON messages FOR UPDATE
    USING (sender_id = auth.uid());

-- Delete own messages
CREATE POLICY "Delete own messages"
    ON messages FOR DELETE
    USING (sender_id = auth.uid());

-- =====================
-- MESSAGE READS POLICIES
-- =====================

CREATE POLICY "View read receipts"
    ON message_reads FOR SELECT
    USING (is_channel_member((SELECT channel_id FROM messages WHERE id = message_id)));

CREATE POLICY "Mark as read"
    ON message_reads FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =====================
-- DOCUMENT POLICIES
-- =====================

CREATE POLICY "View documents"
    ON documents FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Create documents"
    ON documents FOR INSERT
    WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "Update documents"
    ON documents FOR UPDATE
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Delete documents"
    ON documents FOR DELETE
    USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- =====================
-- NOTIFICATION POLICIES
-- =====================

-- Users can only see their own notifications
CREATE POLICY "View own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can create notifications for themselves; trigger functions (SECURITY DEFINER) bypass RLS
CREATE POLICY "Create notifications"
    ON notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can mark own notifications as read
CREATE POLICY "Update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- INTEGRATION POLICIES
-- =====================

CREATE POLICY "View own integrations"
    ON integrations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Create integrations"
    ON integrations FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));

CREATE POLICY "Update own integrations"
    ON integrations FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Delete own integrations"
    ON integrations FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- CALL POLICIES
-- =====================

CREATE POLICY "View calls"
    ON calls FOR SELECT
    USING (is_workspace_member(workspace_id));

CREATE POLICY "Start calls"
    ON calls FOR INSERT
    WITH CHECK (is_workspace_member(workspace_id) AND started_by = auth.uid());

CREATE POLICY "Update calls"
    ON calls FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM call_participants
            WHERE call_id = id AND user_id = auth.uid()
        )
    );

-- =====================
-- CALL PARTICIPANTS POLICIES
-- =====================

CREATE POLICY "View call participants"
    ON call_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calls c
            WHERE c.id = call_id
            AND is_workspace_member(c.workspace_id)
        )
    );

CREATE POLICY "Join calls"
    ON call_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own participation"
    ON call_participants FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Leave calls"
    ON call_participants FOR DELETE
    USING (user_id = auth.uid());

-- =====================
-- AUDIT LOG POLICIES
-- =====================

-- Admins can view audit logs
CREATE POLICY "View audit logs"
    ON audit_logs FOR SELECT
    USING (is_workspace_admin(workspace_id));

-- Audit logs created by trigger (SECURITY DEFINER bypasses RLS).
-- Admin can also insert directly.
CREATE POLICY "Insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (
        workspace_id IS NOT NULL
        AND is_workspace_admin(workspace_id)
    );

-- Users can view their own audit logs
CREATE POLICY "Users view own audit logs"
    ON audit_logs FOR SELECT
    USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
    );
