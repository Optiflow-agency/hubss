-- =============================================================================
-- FIX RLS PERFORMANCE V2 - CORRECTED
-- =============================================================================
-- Questo fix ottimizza tutte le RLS policies usando (select auth.uid())
-- =============================================================================

-- =============================================================================
-- WORKSPACES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Anyone can create workspace" ON workspaces;

CREATE POLICY "Users can view own workspaces" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Owners can update workspace" ON workspaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id
            AND user_id = (select auth.uid())
            AND is_owner = TRUE
        )
    );

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- =============================================================================
-- PROFILES
-- =============================================================================
DROP POLICY IF EXISTS "View profiles in same workspace" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same workspace" ON profiles;

CREATE POLICY "View profiles in same workspace" ON profiles
    FOR SELECT USING (
        id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM workspace_members wm1
            JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = (select auth.uid()) AND wm2.user_id = profiles.id
        )
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

-- =============================================================================
-- WORKSPACE_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "View workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;

CREATE POLICY "View workspace members" ON workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can add members" ON workspace_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

CREATE POLICY "Admins can update members" ON workspace_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

CREATE POLICY "Admins can remove members" ON workspace_members
    FOR DELETE USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

-- =============================================================================
-- ROLES
-- =============================================================================
DROP POLICY IF EXISTS "View workspace roles" ON roles;
DROP POLICY IF EXISTS "Admins can create roles" ON roles;
DROP POLICY IF EXISTS "Admins can update roles" ON roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;

CREATE POLICY "View workspace roles" ON roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = roles.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can create roles" ON roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = roles.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

CREATE POLICY "Admins can update roles" ON roles
    FOR UPDATE USING (
        is_system = FALSE AND
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = roles.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

CREATE POLICY "Admins can delete roles" ON roles
    FOR DELETE USING (
        is_system = FALSE AND
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = roles.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- BOARDS
-- =============================================================================
DROP POLICY IF EXISTS "View boards as member" ON boards;
DROP POLICY IF EXISTS "Create boards with permission" ON boards;
DROP POLICY IF EXISTS "Update boards as member" ON boards;
DROP POLICY IF EXISTS "Admins can delete boards" ON boards;
DROP POLICY IF EXISTS "Users can view boards they are members of" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Board members can update boards" ON boards;

CREATE POLICY "View boards as member" ON boards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = boards.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create boards with permission" ON boards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = boards.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Update boards as member" ON boards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can delete boards" ON boards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = boards.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- BOARD_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "View board members" ON board_members;
DROP POLICY IF EXISTS "Admins can add board members" ON board_members;
DROP POLICY IF EXISTS "Admins can update board members" ON board_members;
DROP POLICY IF EXISTS "Admins can remove board members" ON board_members;
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;

CREATE POLICY "View board members" ON board_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = board_members.board_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can add board members" ON board_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = board_members.board_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can update board members" ON board_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = board_members.board_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can remove board members" ON board_members
    FOR DELETE USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = board_members.board_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

-- =============================================================================
-- TASKS
-- =============================================================================
DROP POLICY IF EXISTS "View tasks as board member" ON tasks;
DROP POLICY IF EXISTS "Create tasks as board member" ON tasks;
DROP POLICY IF EXISTS "Update tasks as board member" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks on their boards" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

CREATE POLICY "View tasks as board member" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = tasks.board_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create tasks as board member" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = tasks.board_id
            AND user_id = (select auth.uid())
            AND can_edit = TRUE
        )
    );

CREATE POLICY "Update tasks as board member" ON tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = tasks.board_id
            AND user_id = (select auth.uid())
            AND can_edit = TRUE
        )
    );

CREATE POLICY "Admins can delete tasks" ON tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM boards b
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE b.id = tasks.board_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

-- =============================================================================
-- TASK_ASSIGNEES
-- =============================================================================
DROP POLICY IF EXISTS "View task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Remove task assignees" ON task_assignees;

CREATE POLICY "View task assignees" ON task_assignees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN boards b ON b.id = t.board_id
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE t.id = task_assignees.task_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Manage task assignees" ON task_assignees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN board_members bm ON bm.board_id = t.board_id
            WHERE t.id = task_assignees.task_id
            AND bm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Remove task assignees" ON task_assignees
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN board_members bm ON bm.board_id = t.board_id
            WHERE t.id = task_assignees.task_id
            AND bm.user_id = (select auth.uid())
        )
    );

-- =============================================================================
-- TASK_ATTACHMENTS
-- =============================================================================
DROP POLICY IF EXISTS "View task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Upload task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Delete own attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can view task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can manage task attachments" ON task_attachments;

CREATE POLICY "View task attachments" ON task_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN boards b ON b.id = t.board_id
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE t.id = task_attachments.task_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Upload task attachments" ON task_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN board_members bm ON bm.board_id = t.board_id
            WHERE t.id = task_attachments.task_id
            AND bm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Delete own attachments" ON task_attachments
    FOR DELETE USING (uploaded_by = (select auth.uid()));

-- =============================================================================
-- TASK_COMMENTS
-- =============================================================================
DROP POLICY IF EXISTS "View task comments" ON task_comments;
DROP POLICY IF EXISTS "Create task comments" ON task_comments;
DROP POLICY IF EXISTS "Update own comments" ON task_comments;
DROP POLICY IF EXISTS "Delete own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments" ON task_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON task_comments;

CREATE POLICY "View task comments" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN boards b ON b.id = t.board_id
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE t.id = task_comments.task_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create task comments" ON task_comments
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update own comments" ON task_comments
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Delete own comments" ON task_comments
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- TIME_LOGS
-- =============================================================================
DROP POLICY IF EXISTS "View time logs" ON time_logs;
DROP POLICY IF EXISTS "Create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Update own time logs" ON time_logs;
DROP POLICY IF EXISTS "Delete own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can view time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can delete own time logs" ON time_logs;

CREATE POLICY "View time logs" ON time_logs
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN boards b ON b.id = t.board_id
            JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE t.id = time_logs.task_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

CREATE POLICY "Create own time logs" ON time_logs
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update own time logs" ON time_logs
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Delete own time logs" ON time_logs
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- CLIENTS
-- =============================================================================
DROP POLICY IF EXISTS "View accessible clients" ON clients;
DROP POLICY IF EXISTS "Create clients" ON clients;
DROP POLICY IF EXISTS "Update clients" ON clients;
DROP POLICY IF EXISTS "Delete clients" ON clients;
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can manage clients" ON clients;

CREATE POLICY "View accessible clients" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = clients.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create clients" ON clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = clients.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Update clients" ON clients
    FOR UPDATE USING (
        owner_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = clients.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

CREATE POLICY "Delete clients" ON clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = clients.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- USER_CLIENT_ACCESS
-- =============================================================================
DROP POLICY IF EXISTS "View client access" ON user_client_access;
DROP POLICY IF EXISTS "Grant client access" ON user_client_access;
DROP POLICY IF EXISTS "Revoke client access" ON user_client_access;
DROP POLICY IF EXISTS "Users can view client access" ON user_client_access;
DROP POLICY IF EXISTS "Admins can manage client access" ON user_client_access;

CREATE POLICY "View client access" ON user_client_access
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = user_client_access.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Grant client access" ON user_client_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = user_client_access.client_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE OR c.owner_id = (select auth.uid()))
        )
    );

CREATE POLICY "Revoke client access" ON user_client_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = user_client_access.client_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE OR c.owner_id = (select auth.uid()))
        )
    );

-- =============================================================================
-- MILESTONES
-- =============================================================================
DROP POLICY IF EXISTS "View milestones" ON milestones;
DROP POLICY IF EXISTS "Manage milestones" ON milestones;
DROP POLICY IF EXISTS "Update milestones" ON milestones;
DROP POLICY IF EXISTS "Delete milestones" ON milestones;
DROP POLICY IF EXISTS "Users can view milestones" ON milestones;
DROP POLICY IF EXISTS "Users can manage milestones" ON milestones;

CREATE POLICY "View milestones" ON milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = milestones.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Manage milestones" ON milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = milestones.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Update milestones" ON milestones
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = milestones.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Delete milestones" ON milestones
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = milestones.client_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

-- =============================================================================
-- TICKETS
-- =============================================================================
DROP POLICY IF EXISTS "View tickets" ON tickets;
DROP POLICY IF EXISTS "Create tickets" ON tickets;
DROP POLICY IF EXISTS "Update tickets" ON tickets;
DROP POLICY IF EXISTS "Delete tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Users can manage tickets" ON tickets;

CREATE POLICY "View tickets" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = tickets.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create tickets" ON tickets
    FOR INSERT WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Update tickets" ON tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = tickets.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Delete tickets" ON tickets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = tickets.client_id
            AND wm.user_id = (select auth.uid())
            AND (wm.is_admin = TRUE OR wm.is_owner = TRUE)
        )
    );

-- =============================================================================
-- CLIENT_FILES
-- =============================================================================
DROP POLICY IF EXISTS "View client files" ON client_files;
DROP POLICY IF EXISTS "Upload client files" ON client_files;
DROP POLICY IF EXISTS "Delete own client files" ON client_files;
DROP POLICY IF EXISTS "Users can view client files" ON client_files;
DROP POLICY IF EXISTS "Users can manage client files" ON client_files;

CREATE POLICY "View client files" ON client_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = client_files.client_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Upload client files" ON client_files
    FOR INSERT WITH CHECK (uploaded_by = (select auth.uid()));

CREATE POLICY "Delete own client files" ON client_files
    FOR DELETE USING (uploaded_by = (select auth.uid()));

-- =============================================================================
-- CHANNELS
-- =============================================================================
DROP POLICY IF EXISTS "View channels" ON channels;
DROP POLICY IF EXISTS "Create channels" ON channels;
DROP POLICY IF EXISTS "Update channels" ON channels;
DROP POLICY IF EXISTS "Delete channels" ON channels;
DROP POLICY IF EXISTS "Users can view channels" ON channels;
DROP POLICY IF EXISTS "Users can create channels" ON channels;
DROP POLICY IF EXISTS "Users can update channels" ON channels;

CREATE POLICY "View channels" ON channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create channels" ON channels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Update channels" ON channels
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Delete channels" ON channels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = channels.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- CHANNEL_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "View channel members" ON channel_members;
DROP POLICY IF EXISTS "Join channels" ON channel_members;
DROP POLICY IF EXISTS "Update channel membership" ON channel_members;
DROP POLICY IF EXISTS "Leave channels" ON channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON channel_members;
DROP POLICY IF EXISTS "Users can join channels" ON channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON channel_members;

CREATE POLICY "View channel members" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = channel_members.channel_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Join channels" ON channel_members
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update channel membership" ON channel_members
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Leave channels" ON channel_members
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- MESSAGES
-- =============================================================================
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Send messages" ON messages;
DROP POLICY IF EXISTS "Edit own messages" ON messages;
DROP POLICY IF EXISTS "Delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

CREATE POLICY "View messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = messages.channel_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Edit own messages" ON messages
    FOR UPDATE USING (sender_id = (select auth.uid()));

CREATE POLICY "Delete own messages" ON messages
    FOR DELETE USING (sender_id = (select auth.uid()));

-- =============================================================================
-- MESSAGE_READS
-- =============================================================================
DROP POLICY IF EXISTS "View read receipts" ON message_reads;
DROP POLICY IF EXISTS "Mark as read" ON message_reads;
DROP POLICY IF EXISTS "Users can view own read status" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;

CREATE POLICY "View read receipts" ON message_reads
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Mark as read" ON message_reads
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update read status" ON message_reads
    FOR UPDATE USING (user_id = (select auth.uid()));

-- =============================================================================
-- DOCUMENTS
-- =============================================================================
DROP POLICY IF EXISTS "View documents" ON documents;
DROP POLICY IF EXISTS "Create documents" ON documents;
DROP POLICY IF EXISTS "Update documents" ON documents;
DROP POLICY IF EXISTS "Delete documents" ON documents;
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can manage documents" ON documents;

CREATE POLICY "View documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Create documents" ON documents
    FOR INSERT WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Update documents" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Delete documents" ON documents
    FOR DELETE USING (
        created_by = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- NOTIFICATIONS (no workspace_id column)
-- =============================================================================
DROP POLICY IF EXISTS "View own notifications" ON notifications;
DROP POLICY IF EXISTS "Create notifications" ON notifications;
DROP POLICY IF EXISTS "Update own notifications" ON notifications;
DROP POLICY IF EXISTS "Delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "View own notifications" ON notifications
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Create notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Update own notifications" ON notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Delete own notifications" ON notifications
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- INTEGRATIONS
-- =============================================================================
DROP POLICY IF EXISTS "View own integrations" ON integrations;
DROP POLICY IF EXISTS "Create integrations" ON integrations;
DROP POLICY IF EXISTS "Update own integrations" ON integrations;
DROP POLICY IF EXISTS "Delete own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can manage own integrations" ON integrations;

CREATE POLICY "View own integrations" ON integrations
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Create integrations" ON integrations
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update own integrations" ON integrations
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Delete own integrations" ON integrations
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- CALLS
-- =============================================================================
DROP POLICY IF EXISTS "View calls" ON calls;
DROP POLICY IF EXISTS "Start calls" ON calls;
DROP POLICY IF EXISTS "Update calls" ON calls;
DROP POLICY IF EXISTS "Users can view calls" ON calls;
DROP POLICY IF EXISTS "Users can create calls" ON calls;
DROP POLICY IF EXISTS "Users can update calls" ON calls;

CREATE POLICY "View calls" ON calls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = calls.workspace_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Start calls" ON calls
    FOR INSERT WITH CHECK (started_by = (select auth.uid()));

CREATE POLICY "Update calls" ON calls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM call_participants
            WHERE call_id = calls.id
            AND user_id = (select auth.uid())
        )
    );

-- =============================================================================
-- CALL_PARTICIPANTS
-- =============================================================================
DROP POLICY IF EXISTS "View call participants" ON call_participants;
DROP POLICY IF EXISTS "Join calls" ON call_participants;
DROP POLICY IF EXISTS "Update own participation" ON call_participants;
DROP POLICY IF EXISTS "Leave calls" ON call_participants;
DROP POLICY IF EXISTS "Users can view call participants" ON call_participants;
DROP POLICY IF EXISTS "Users can join calls" ON call_participants;
DROP POLICY IF EXISTS "Users can leave calls" ON call_participants;

CREATE POLICY "View call participants" ON call_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM calls c
            JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = call_participants.call_id
            AND wm.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Join calls" ON call_participants
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Update own participation" ON call_participants
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Leave calls" ON call_participants
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- AUDIT_LOGS
-- =============================================================================
DROP POLICY IF EXISTS "View audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;

CREATE POLICY "View audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = audit_logs.workspace_id
            AND user_id = (select auth.uid())
            AND (is_admin = TRUE OR is_owner = TRUE)
        )
    );

-- =============================================================================
-- DONE!
-- =============================================================================
SELECT 'All RLS policies optimized!' as result;
