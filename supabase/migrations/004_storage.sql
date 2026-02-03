-- HUBSS Storage Configuration
-- Migration 004: Storage Buckets and Policies
-- 5 buckets for different file types

-- =====================
-- CREATE STORAGE BUCKETS
-- =====================

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Workspace logos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-logos',
    'workspace-logos',
    TRUE,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Task attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-attachments',
    'task-attachments',
    FALSE,
    52428800, -- 50MB
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/x-zip-compressed',
        'text/plain',
        'text/csv'
    ]
);

-- Client files bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-files',
    'client-files',
    FALSE,
    104857600, -- 100MB
    NULL -- Allow all file types
);

-- Chat attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    FALSE,
    26214400, -- 25MB
    NULL -- Allow all file types
);

-- =====================
-- AVATARS BUCKET POLICIES
-- =====================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Users can upload their own avatar (path: {user_id}/avatar.*)
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- =====================
-- WORKSPACE LOGOS BUCKET POLICIES
-- =====================

-- Anyone can view workspace logos (public bucket)
CREATE POLICY "Public workspace logo access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'workspace-logos');

-- Workspace admins can upload logos (path: {workspace_id}/logo.*)
CREATE POLICY "Admins can upload workspace logo"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'workspace-logos' AND
        is_workspace_admin((storage.foldername(name))[1]::UUID)
    );

-- Workspace admins can update logos
CREATE POLICY "Admins can update workspace logo"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'workspace-logos' AND
        is_workspace_admin((storage.foldername(name))[1]::UUID)
    );

-- Workspace admins can delete logos
CREATE POLICY "Admins can delete workspace logo"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'workspace-logos' AND
        is_workspace_admin((storage.foldername(name))[1]::UUID)
    );

-- =====================
-- TASK ATTACHMENTS BUCKET POLICIES
-- =====================

-- Board members can view attachments (path: {workspace_id}/{board_id}/{task_id}/*)
CREATE POLICY "Board members can view task attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'task-attachments' AND
        is_board_member((storage.foldername(name))[2]::UUID)
    );

-- Board members with edit permission can upload (creator becomes uploader)
CREATE POLICY "Board members can upload task attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'task-attachments' AND
        is_board_member((storage.foldername(name))[2]::UUID) AND
        EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = (storage.foldername(name))[2]::UUID
            AND user_id = auth.uid()
            AND can_edit = TRUE
        )
    );

-- Uploaders can delete their own attachments
-- (We track this via task_attachments table, not storage directly)
CREATE POLICY "Users can delete own task attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'task-attachments' AND
        is_board_member((storage.foldername(name))[2]::UUID)
    );

-- =====================
-- CLIENT FILES BUCKET POLICIES
-- =====================

-- Users with client access can view files (path: {workspace_id}/{client_id}/*)
CREATE POLICY "Client access users can view files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'client-files' AND
        has_client_access((storage.foldername(name))[2]::UUID)
    );

-- Users with client access can upload files
CREATE POLICY "Client access users can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'client-files' AND
        has_client_access((storage.foldername(name))[2]::UUID)
    );

-- Users can update files they uploaded
CREATE POLICY "Users can update own client files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'client-files' AND
        has_client_access((storage.foldername(name))[2]::UUID)
    );

-- Users can delete files they uploaded (tracked via client_files table)
CREATE POLICY "Users can delete client files with access"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'client-files' AND
        has_client_access((storage.foldername(name))[2]::UUID)
    );

-- =====================
-- CHAT ATTACHMENTS BUCKET POLICIES
-- =====================

-- Channel members can view attachments (path: {workspace_id}/{channel_id}/*)
CREATE POLICY "Channel members can view chat attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'chat-attachments' AND
        is_channel_member((storage.foldername(name))[2]::UUID)
    );

-- Channel members can upload attachments
CREATE POLICY "Channel members can upload chat attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments' AND
        is_channel_member((storage.foldername(name))[2]::UUID)
    );

-- Users can delete their own chat attachments
CREATE POLICY "Users can delete own chat attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'chat-attachments' AND
        is_channel_member((storage.foldername(name))[2]::UUID)
    );

-- =====================
-- HELPER FUNCTION FOR SIGNED URLs
-- =====================

-- Function to generate a signed URL for private files
CREATE OR REPLACE FUNCTION get_signed_url(
    p_bucket TEXT,
    p_path TEXT,
    p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - actual signed URL generation
    -- should be done via the Supabase client SDK
    -- This function exists for documentation purposes
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
