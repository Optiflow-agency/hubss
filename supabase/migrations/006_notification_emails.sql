-- =============================================
-- 006: Auto-send email when notification is created
-- Uses pg_net to call the Edge Function
-- =============================================

-- Enable pg_net extension (async HTTP from PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: send email via Edge Function when a notification is inserted
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Fire-and-forget HTTP POST to Edge Function
    PERFORM net.http_post(
        url := 'https://boggskauypdcltvkfaij.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZ2dza2F1eXBkY2x0dmtmYWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI1NTQsImV4cCI6MjA4NTYyODU1NH0.zNI0ULxo6B78550036Zk5RYuulL7MwMZy2Ywou7n1O8'
        ),
        body := jsonb_build_object(
            'type', NEW.type,
            'userId', NEW.user_id,
            'data', COALESCE(NEW.data, '{}'::jsonb)
        )
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the notification insert if email fails
        RAISE WARNING 'Failed to send notification email: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: fire on every new notification
DROP TRIGGER IF EXISTS send_email_on_notification ON notifications;
CREATE TRIGGER send_email_on_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_email();
