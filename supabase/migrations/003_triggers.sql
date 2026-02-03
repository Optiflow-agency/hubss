-- HUBSS Database Triggers
-- Migration 003: Triggers and Functions
-- Automatic data management

-- =====================
-- UPDATED_AT TRIGGER
-- =====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- TIME LOG DURATION CALCULATION
-- =====================

CREATE OR REPLACE FUNCTION calculate_time_log_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate duration when end_time is set
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) * 1000;

        -- Update task's total time spent
        UPDATE tasks
        SET total_time_spent = total_time_spent + NEW.duration
        WHERE id = NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_log_duration_trigger
    BEFORE UPDATE ON time_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_time_log_duration();

-- Also handle manual time logs
CREATE OR REPLACE FUNCTION handle_manual_time_log()
RETURNS TRIGGER AS $$
BEGIN
    -- For manual entries, duration is already set
    IF NEW.is_manual = TRUE AND NEW.duration > 0 THEN
        UPDATE tasks
        SET total_time_spent = total_time_spent + NEW.duration
        WHERE id = NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_manual_time_log_trigger
    AFTER INSERT ON time_logs
    FOR EACH ROW EXECUTE FUNCTION handle_manual_time_log();

-- =====================
-- MESSAGE REPLY COUNT
-- =====================

CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.thread_id IS NOT NULL THEN
        UPDATE messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' AND OLD.thread_id IS NOT NULL THEN
        UPDATE messages
        SET reply_count = GREATEST(0, reply_count - 1)
        WHERE id = OLD.thread_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reply_count_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();

CREATE TRIGGER update_reply_count_on_delete
    AFTER DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_message_reply_count();

-- =====================
-- TASK COMPLETION TRACKING
-- =====================

CREATE OR REPLACE FUNCTION track_task_completion()
RETURNS TRIGGER AS $$
DECLARE
    board_columns JSONB;
    done_column_title TEXT;
BEGIN
    -- Get the board's columns to find the "done" status
    SELECT columns INTO board_columns FROM boards WHERE id = NEW.board_id;

    -- Find the done column (last column is typically done)
    done_column_title := board_columns->-1->>'title';

    -- Track completion
    IF NEW.status = done_column_title AND (OLD.status IS NULL OR OLD.status != done_column_title) THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != done_column_title AND OLD.status = done_column_title THEN
        -- Task moved back from done - increment rework count
        NEW.completed_at = NULL;
        NEW.rework_count = COALESCE(OLD.rework_count, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_task_completion_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION track_task_completion();

-- =====================
-- NEW USER PROFILE CREATION
-- =====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name, avatar)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (requires superuser/owner)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- WORKSPACE CREATION - ADD OWNER
-- =====================

CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the user who created the workspace (from auth context)
    INSERT INTO workspace_members (workspace_id, user_id, is_owner, is_admin)
    VALUES (NEW.id, auth.uid(), TRUE, TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_workspace_owner_trigger
    AFTER INSERT ON workspaces
    FOR EACH ROW EXECUTE FUNCTION add_workspace_owner();

-- =====================
-- BOARD CREATION - ADD CREATOR AS MEMBER
-- =====================

CREATE OR REPLACE FUNCTION add_board_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO board_members (board_id, user_id, can_edit)
        VALUES (NEW.id, NEW.created_by, TRUE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_board_creator_trigger
    AFTER INSERT ON boards
    FOR EACH ROW EXECUTE FUNCTION add_board_creator_as_member();

-- =====================
-- CHANNEL CREATION - ADD CREATOR AS MEMBER
-- =====================

CREATE OR REPLACE FUNCTION add_channel_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO channel_members (channel_id, user_id)
        VALUES (NEW.id, NEW.created_by);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_channel_creator_trigger
    AFTER INSERT ON channels
    FOR EACH ROW EXECUTE FUNCTION add_channel_creator_as_member();

-- =====================
-- AUDIT LOG FUNCTION
-- =====================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id_val UUID;
    entity_type_val TEXT;
BEGIN
    -- Determine entity type from table name
    entity_type_val := TG_TABLE_NAME;

    -- Try to get workspace_id from the record
    IF TG_OP = 'DELETE' THEN
        workspace_id_val := COALESCE(
            OLD.workspace_id,
            (SELECT workspace_id FROM boards WHERE id = OLD.board_id LIMIT 1),
            (SELECT workspace_id FROM clients WHERE id = OLD.client_id LIMIT 1),
            (SELECT workspace_id FROM channels WHERE id = OLD.channel_id LIMIT 1)
        );
    ELSE
        workspace_id_val := COALESCE(
            NEW.workspace_id,
            (SELECT workspace_id FROM boards WHERE id = NEW.board_id LIMIT 1),
            (SELECT workspace_id FROM clients WHERE id = NEW.client_id LIMIT 1),
            (SELECT workspace_id FROM channels WHERE id = NEW.channel_id LIMIT 1)
        );
    END IF;

    INSERT INTO audit_logs (workspace_id, user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (
        workspace_id_val,
        auth.uid(),
        TG_OP,
        entity_type_val,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit logging to critical tables
CREATE TRIGGER audit_boards
    AFTER INSERT OR UPDATE OR DELETE ON boards
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_workspace_members
    AFTER INSERT OR UPDATE OR DELETE ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =====================
-- NOTIFICATION CREATION HELPERS
-- =====================

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_body TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify on task assignment
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    task_rec RECORD;
    assignee_name TEXT;
BEGIN
    SELECT t.*, b.title as board_title
    INTO task_rec
    FROM tasks t
    JOIN boards b ON b.id = t.board_id
    WHERE t.id = NEW.task_id;

    SELECT name INTO assignee_name FROM profiles WHERE id = auth.uid();

    -- Don't notify if assigning to yourself
    IF NEW.user_id != auth.uid() THEN
        PERFORM create_notification(
            NEW.user_id,
            'task_assigned',
            'Nuova attività assegnata',
            'Ti è stata assegnata l''attività "' || task_rec.title || '" in ' || task_rec.board_title,
            jsonb_build_object('task_id', NEW.task_id, 'board_id', task_rec.board_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_task_assignment
    AFTER INSERT ON task_assignees
    FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

-- Notify on mention in message
CREATE OR REPLACE FUNCTION notify_mention()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id UUID;
    mention_pattern TEXT;
    channel_rec RECORD;
BEGIN
    SELECT * INTO channel_rec FROM channels WHERE id = NEW.channel_id;

    -- Find @mentions in the message content
    FOR mentioned_user_id IN
        SELECT p.id
        FROM profiles p
        WHERE NEW.content ~* ('@' || p.name)
        AND p.id != NEW.sender_id
    LOOP
        PERFORM create_notification(
            mentioned_user_id,
            'mention',
            'Menzionato in ' || channel_rec.name,
            NEW.content,
            jsonb_build_object('channel_id', NEW.channel_id, 'message_id', NEW.id)
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_mention
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_mention();

-- =====================
-- TASK COMMENT COUNT UPDATE
-- =====================

CREATE OR REPLACE FUNCTION update_task_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Note: The tasks table doesn't have a comments column,
        -- but the frontend type has it. We could add it or compute it on read.
        -- For now, this is a placeholder for future use.
        NULL;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================
-- UTILITY FUNCTIONS
-- =====================

-- Get user's current workspace
CREATE OR REPLACE FUNCTION get_current_workspace()
RETURNS UUID AS $$
DECLARE
    ws_id UUID;
BEGIN
    SELECT workspace_id INTO ws_id
    FROM profiles
    WHERE id = auth.uid();

    RETURN ws_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's running time log (if any)
CREATE OR REPLACE FUNCTION get_running_time_log()
RETURNS SETOF time_logs AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM time_logs
    WHERE user_id = auth.uid()
    AND end_time IS NULL
    ORDER BY start_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stop all running time logs for a user
CREATE OR REPLACE FUNCTION stop_running_time_logs()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE time_logs
    SET end_time = NOW(),
        duration = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000
    WHERE user_id = auth.uid()
    AND end_time IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread message count for a channel
CREATE OR REPLACE FUNCTION get_unread_count(p_channel_id UUID)
RETURNS INTEGER AS $$
DECLARE
    last_read TIMESTAMPTZ;
    unread INTEGER;
BEGIN
    SELECT last_read_at INTO last_read
    FROM channel_members
    WHERE channel_id = p_channel_id AND user_id = auth.uid();

    SELECT COUNT(*) INTO unread
    FROM messages
    WHERE channel_id = p_channel_id
    AND created_at > COALESCE(last_read, '1970-01-01'::TIMESTAMPTZ)
    AND sender_id != auth.uid();

    RETURN unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
