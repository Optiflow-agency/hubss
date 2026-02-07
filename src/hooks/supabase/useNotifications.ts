import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Notification } from '../../types/supabase';
import { useAuth } from './useAuth';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw new Error(fetchError.message);
      setNotifications(data);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (updateError) {
      setError(new Error(updateError.message));
    } else {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);

    if (updateError) {
      setError(new Error(updateError.message));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setNotifications([]);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
}

export default useNotifications;
