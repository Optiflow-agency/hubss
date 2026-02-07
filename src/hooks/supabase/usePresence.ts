import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { useAuth } from './useAuth';
import { useUser } from './useUser';

interface PresenceState {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'busy' | 'offline' | 'away';
  lastSeen: string;
  typing?: boolean;
}

interface UsePresenceReturn {
  onlineUsers: PresenceState[];
  typingUsers: string[];
  isUserOnline: (userId: string) => boolean;
  getUserStatus: (userId: string) => PresenceState | undefined;
  setTyping: (isTyping: boolean) => void;
  updateMyStatus: (status: PresenceState['status']) => void;
}

export function usePresence(channelName?: string): UsePresenceReturn {
  const { user } = useAuth();
  const { profile, updateStatus } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Default channel is workspace presence
  const resolvedChannelName = channelName ?? `presence:${profile?.workspace_id}`;

  useEffect(() => {
    if (!user || !profile?.workspace_id) return;

    // Create presence channel
    const channel = supabase.channel(resolvedChannelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceState>();
      const users = Object.values(state).flat() as PresenceState[];
      setOnlineUsers(users);

      // Extract typing users
      const typing = users
        .filter(u => u.typing && u.id !== user.id)
        .map(u => u.id);
      setTypingUsers(typing);
    });

    // Handle user join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    });

    // Handle user leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    });

    // Subscribe and track own presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const p = profileRef.current;
        if (p) {
          await channel.track({
            id: user.id,
            name: p.name,
            avatar: p.avatar,
            status: p.status,
            lastSeen: new Date().toISOString(),
            typing: false,
          });
        }
      }
    });

    channelRef.current = channel;

    // Update status to online
    updateStatus('online');

    // Handle visibility change (tab focus)
    const handleVisibilityChange = async () => {
      const p = profileRef.current;
      if (!p) return;
      const newStatus = document.hidden ? 'away' : 'online';
      await updateStatus(newStatus);
      await channel.track({
        id: user.id,
        name: p.name,
        avatar: p.avatar,
        status: newStatus,
        lastSeen: new Date().toISOString(),
        typing: false,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload (tab close)
    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Update status to offline
      updateStatus('offline');

      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  // NOTE: profile?.status intentionally excluded to prevent infinite loop
  // (updateStatus changes profile.status which would re-trigger this effect)
  }, [user, profile?.workspace_id, resolvedChannelName]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(u => u.id === userId && u.status !== 'offline');
  }, [onlineUsers]);

  const getUserStatus = useCallback((userId: string) => {
    return onlineUsers.find(u => u.id === userId);
  }, [onlineUsers]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user || !profile) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence with typing state
    await channelRef.current.track({
      id: user.id,
      name: profile.name,
      avatar: profile.avatar,
      status: profile.status,
      lastSeen: new Date().toISOString(),
      typing: isTyping,
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  }, [user, profile]);

  const updateMyStatus = useCallback(async (status: PresenceState['status']) => {
    if (!channelRef.current || !user || !profile) return;

    // Update database
    await updateStatus(status);

    // Update presence
    await channelRef.current.track({
      id: user.id,
      name: profile.name,
      avatar: profile.avatar,
      status,
      lastSeen: new Date().toISOString(),
      typing: false,
    });
  }, [user, profile, updateStatus]);

  return {
    onlineUsers,
    typingUsers,
    isUserOnline,
    getUserStatus,
    setTyping,
    updateMyStatus,
  };
}

// Hook for typing indicators in a specific channel
export function useTypingIndicator(channelId: string) {
  const { user } = useAuth();
  const { profile } = useUser();
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingUsersTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!user || !channelId) return;

    const channel = supabase.channel(`typing:${channelId}`);

    channel.on('broadcast', { event: 'typing_start' }, ({ payload }) => {
      if (payload.userId === user.id) return;

      setTypingUsers(prev => {
        const exists = prev.some(u => u.id === payload.userId);
        if (exists) return prev;
        return [...prev, { id: payload.userId, name: payload.userName }];
      });

      // Clear this user's typing after 3 seconds
      const existingTimeout = typingUsersTimeoutsRef.current.get(payload.userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
        typingUsersTimeoutsRef.current.delete(payload.userId);
      }, 3000);

      typingUsersTimeoutsRef.current.set(payload.userId, timeout);
    });

    channel.on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
      setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));

      const timeout = typingUsersTimeoutsRef.current.get(payload.userId);
      if (timeout) {
        clearTimeout(timeout);
        typingUsersTimeoutsRef.current.delete(payload.userId);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      // Clear all timeouts
      typingUsersTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingUsersTimeoutsRef.current.clear();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [user, channelId]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !user || !profile) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_start',
      payload: { userId: user.id, userName: profile.name },
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [user, profile]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: { userId: user.id },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [user]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

export default usePresence;
