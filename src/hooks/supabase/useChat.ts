import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, callEdgeFunction } from '../../lib/supabase';
import type { Message, Profile, Tables } from '../../types/supabase';
import { useAuth } from './useAuth';

interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

type MessageWithSender = Message & {
  sender: Profile | null;
  replies?: MessageWithSender[];
};

interface UseChatReturn {
  messages: MessageWithSender[];
  loading: boolean;
  error: Error | null;
  sendMessage: (content: string, threadId?: string) => Promise<Message | null>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  pinMessage: (messageId: string, pinned: boolean) => Promise<void>;
  getPinnedMessages: () => MessageWithSender[];
  getThreadMessages: (threadId: string) => Promise<MessageWithSender[]>;
  sendAiMessage: (content: string, context?: Record<string, unknown>) => Promise<Message | null>;
  markAsRead: (messageId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const PAGE_SIZE = 50;

export function useChat(channelId?: string): UseChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchMessages = useCallback(async (reset = true) => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (reset) {
      offsetRef.current = 0;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('channel_id', channelId)
        .is('thread_id', null) // Only top-level messages
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

      if (fetchError) throw new Error(fetchError.message);

      const newMessages = data as MessageWithSender[];
      setHasMore(newMessages.length === PAGE_SIZE);

      if (reset) {
        setMessages(newMessages.reverse());
      } else {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      }
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [channelId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages with realtime
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the new message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:profiles(*)`)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            // Only add to top-level if not a reply
            if (!data.thread_id) {
              setMessages(prev => [...prev, data as MessageWithSender]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const sendMessage = useCallback(async (content: string, threadId?: string) => {
    if (!user || !channelId) return null;

    setError(null);

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content,
        thread_id: threadId,
      })
      .select()
      .single();

    if (sendError) {
      setError(new Error(sendError.message));
      return null;
    }

    return data;
  }, [user, channelId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    setError(null);

    const { error: editError } = await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', messageId);

    if (editError) {
      setError(new Error(editError.message));
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    setError(null);

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    }
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = (message.reactions as Reaction[]) || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);

    let newReactions: Reaction[];
    if (existingReaction) {
      // Check if user already reacted with this emoji
      if (existingReaction.userIds.includes(user.id)) return;
      // Add user to existing reaction
      newReactions = reactions.map(r =>
        r.emoji === emoji
          ? { ...r, userIds: [...r.userIds, user.id], count: r.count + 1 }
          : r
      );
    } else {
      // Add new reaction
      newReactions = [...reactions, { emoji, userIds: [user.id], count: 1 }];
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId);

    if (updateError) {
      setError(new Error(updateError.message));
    }
  }, [user, messages]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = (message.reactions as Reaction[]) || [];
    const newReactions = reactions
      .map(r => r.emoji === emoji
        ? { ...r, userIds: r.userIds.filter(id => id !== user.id), count: r.count - 1 }
        : r
      )
      .filter(r => r.count > 0);

    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId);

    if (updateError) {
      setError(new Error(updateError.message));
    }
  }, [user, messages]);

  const pinMessage = useCallback(async (messageId: string, pinned: boolean) => {
    setError(null);

    const { error: pinError } = await supabase
      .from('messages')
      .update({ pinned })
      .eq('id', messageId);

    if (pinError) {
      setError(new Error(pinError.message));
    }
  }, []);

  const getPinnedMessages = useCallback(() => {
    return messages.filter(m => m.pinned);
  }, [messages]);

  const getThreadMessages = useCallback(async (threadId: string) => {
    if (!channelId) return [];

    const { data, error: fetchError } = await supabase
      .from('messages')
      .select(`*, sender:profiles(*)`)
      .eq('channel_id', channelId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching thread messages:', fetchError);
      return [];
    }

    return (data ?? []) as MessageWithSender[];
  }, [channelId]);

  const sendAiMessage = useCallback(async (
    content: string,
    context?: Record<string, unknown>
  ) => {
    if (!user || !channelId) return null;

    setError(null);

    try {
      // First, send user's message
      await sendMessage(content);

      // Call AI proxy Edge Function
      const response = await callEdgeFunction<{ content: string }>('ai-proxy', {
        message: content,
        context,
        channelId,
      });

      // Send AI response as a message
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          content: response.content,
          is_ai: true,
        })
        .select()
        .single();

      if (sendError) throw new Error(sendError.message);

      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [user, channelId, sendMessage]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('message_reads')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      });

    // Also update channel_members last_read_at
    if (channelId) {
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
    }
  }, [user, channelId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    offsetRef.current += PAGE_SIZE;
    await fetchMessages(false);
  }, [hasMore, loading, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    pinMessage,
    getPinnedMessages,
    getThreadMessages,
    sendAiMessage,
    markAsRead,
    loadMore,
    hasMore,
  };
}

export default useChat;
