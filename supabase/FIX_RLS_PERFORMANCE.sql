-- =============================================================================
-- FIX RLS PERFORMANCE - Auth RLS Initialization Plan
-- =============================================================================
-- Questo fix ottimizza tutte le RLS policies usando (select auth.uid())
-- invece di auth.uid() per migliorare le performance
-- =============================================================================

-- Prima droppa tutte le policies esistenti e le ricrea ottimizzate

-- =============================================================================
-- WORKSPACES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their workspace" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Anyone can create workspace" ON workspaces;

CREATE POLICY "Users can view their workspace" ON workspaces
    FOR SELECT USING (
        id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Admins can update workspace" ON workspaces
    FOR UPDATE USING (
        id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Anyone can create workspace" ON workspaces
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- =============================================================================
-- PROFILES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view profiles in same workspace" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view profiles in same workspace" ON profiles
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
        OR id = (select auth.uid())
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

-- =============================================================================
-- WORKSPACE_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;

CREATE POLICY "Members can view workspace members" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Admins can manage workspace members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- BOARDS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view boards they are members of" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Board members can update boards" ON boards;
DROP POLICY IF EXISTS "Admins can delete boards" ON boards;

CREATE POLICY "Users can view boards they are members of" ON boards
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can create boards" ON boards
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Board members can update boards" ON boards
    FOR UPDATE USING (
        id IN (SELECT board_id FROM board_members WHERE user_id = (select auth.uid()))
    );

CREATE POLICY "Admins can delete boards" ON boards
    FOR DELETE USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- BOARD_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;

CREATE POLICY "Users can view board members" ON board_members
    FOR SELECT USING (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Board owners can manage members" ON board_members
    FOR ALL USING (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- TASKS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view tasks on their boards" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks on their boards" ON tasks
    FOR SELECT USING (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can update tasks" ON tasks
    FOR UPDATE USING (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can delete tasks" ON tasks
    FOR DELETE USING (
        board_id IN (SELECT id FROM boards WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- TASK_ATTACHMENTS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view task attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can manage task attachments" ON task_attachments;

CREATE POLICY "Users can view task attachments" ON task_attachments
    FOR SELECT USING (
        task_id IN (SELECT id FROM tasks WHERE board_id IN
            (SELECT id FROM boards WHERE workspace_id IN
                (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))))
    );

CREATE POLICY "Users can manage task attachments" ON task_attachments
    FOR ALL USING (
        task_id IN (SELECT id FROM tasks WHERE board_id IN
            (SELECT id FROM boards WHERE workspace_id IN
                (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))))
    );

-- =============================================================================
-- TASK_COMMENTS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments" ON task_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON task_comments;

CREATE POLICY "Users can view task comments" ON task_comments
    FOR SELECT USING (
        task_id IN (SELECT id FROM tasks WHERE board_id IN
            (SELECT id FROM boards WHERE workspace_id IN
                (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))))
    );

CREATE POLICY "Users can create comments" ON task_comments
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own comments" ON task_comments
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own comments" ON task_comments
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- TIME_LOGS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can delete own time logs" ON time_logs;

CREATE POLICY "Users can view time logs" ON time_logs
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        task_id IN (SELECT id FROM tasks WHERE board_id IN
            (SELECT id FROM boards WHERE workspace_id IN
                (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))))
    );

CREATE POLICY "Users can create own time logs" ON time_logs
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own time logs" ON time_logs
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own time logs" ON time_logs
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- CLIENTS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can manage clients" ON clients;

CREATE POLICY "Users can view clients" ON clients
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can manage clients" ON clients
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- USER_CLIENT_ACCESS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view client access" ON user_client_access;
DROP POLICY IF EXISTS "Admins can manage client access" ON user_client_access;

CREATE POLICY "Users can view client access" ON user_client_access
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Admins can manage client access" ON user_client_access
    FOR ALL USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- MILESTONES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view milestones" ON milestones;
DROP POLICY IF EXISTS "Users can manage milestones" ON milestones;

CREATE POLICY "Users can view milestones" ON milestones
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can manage milestones" ON milestones
    FOR ALL USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- TICKETS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Users can manage tickets" ON tickets;

CREATE POLICY "Users can view tickets" ON tickets
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can manage tickets" ON tickets
    FOR ALL USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- CLIENT_FILES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view client files" ON client_files;
DROP POLICY IF EXISTS "Users can manage client files" ON client_files;

CREATE POLICY "Users can view client files" ON client_files
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can manage client files" ON client_files
    FOR ALL USING (
        client_id IN (SELECT id FROM clients WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

-- =============================================================================
-- CHANNELS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view channels" ON channels;
DROP POLICY IF EXISTS "Users can create channels" ON channels;
DROP POLICY IF EXISTS "Users can update channels" ON channels;

CREATE POLICY "Users can view channels" ON channels
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can create channels" ON channels
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can update channels" ON channels
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- CHANNEL_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view channel members" ON channel_members;
DROP POLICY IF EXISTS "Users can join channels" ON channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON channel_members;

CREATE POLICY "Users can view channel members" ON channel_members
    FOR SELECT USING (
        channel_id IN (SELECT id FROM channels WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can join channels" ON channel_members
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can leave channels" ON channel_members
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- MESSAGES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        channel_id IN (SELECT id FROM channels WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (sender_id = (select auth.uid()));

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (sender_id = (select auth.uid()));

-- =============================================================================
-- MESSAGE_READS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own read status" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;

CREATE POLICY "Users can view own read status" ON message_reads
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can mark messages as read" ON message_reads
    FOR ALL USING (user_id = (select auth.uid()));

-- =============================================================================
-- DOCUMENTS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can manage documents" ON documents;

CREATE POLICY "Users can view documents" ON documents
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can manage documents" ON documents
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- INTEGRATIONS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can manage own integrations" ON integrations;

CREATE POLICY "Users can view own integrations" ON integrations
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own integrations" ON integrations
    FOR ALL USING (user_id = (select auth.uid()));

-- =============================================================================
-- CALLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view calls" ON calls;
DROP POLICY IF EXISTS "Users can create calls" ON calls;
DROP POLICY IF EXISTS "Users can update calls" ON calls;

CREATE POLICY "Users can view calls" ON calls
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (initiated_by = (select auth.uid()));

CREATE POLICY "Users can update calls" ON calls
    FOR UPDATE USING (initiated_by = (select auth.uid()));

-- =============================================================================
-- CALL_PARTICIPANTS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view call participants" ON call_participants;
DROP POLICY IF EXISTS "Users can join calls" ON call_participants;
DROP POLICY IF EXISTS "Users can leave calls" ON call_participants;

CREATE POLICY "Users can view call participants" ON call_participants
    FOR SELECT USING (
        call_id IN (SELECT id FROM calls WHERE workspace_id IN
            (SELECT workspace_id FROM profiles WHERE id = (select auth.uid())))
    );

CREATE POLICY "Users can join calls" ON call_participants
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can leave calls" ON call_participants
    FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================================================
-- AUDIT_LOGS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;

CREATE POLICY "Users can view audit logs" ON audit_logs
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM profiles WHERE id = (select auth.uid()))
    );

-- =============================================================================
-- DONE!
-- =============================================================================
SELECT 'All RLS policies optimized!' as result;
