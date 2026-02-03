import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Channel, Profile, Tables } from '../../types/supabase';
import { useAuth } from './useAuth';
import { useUser } from './useUser';

type ChannelMember = Tables<'channel_members'> & {
  profile: Profile;
};

type ChannelWithMembers = Channel & {
  members: ChannelMember[];
  unreadCount?: number;
};

interface UseChannelsReturn {
  channels: ChannelWithMembers[];
  loading: boolean;
  error: Error | null;
  getChannel: (channelId: string) => ChannelWithMembers | undefined;
  getChannelsByCategory: (category: string) => ChannelWithMembers[];
  createChannel: (
    name: string,
    type: Channel['type'],
    options?: {
      category?: string;
      description?: string;
      isPrivate?: boolean;
      clientId?: string;
    }
  ) => Promise<Channel | null>;
  updateChannel: (channelId: string, updates: Partial<Channel>) => Promise<Channel | null>;
  deleteChannel: (channelId: string) => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  muteChannel: (channelId: string, muted: boolean) => Promise<void>;
  createDM: (userId: string) => Promise<Channel | null>;
  refetch: () => Promise<void>;
}

export function useChannels(): UseChannelsReturn {
  const { user } = useAuth();
  const { profile } = useUser();
  const [channels, setChannels] = useState<ChannelWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!profile?.workspace_id) {
      setChannels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch channels with members
      const { data, error: fetchError } = await supabase
        .from('channels')
        .select(`
          *,
          members:channel_members(
            *,
            profile:profiles(*)
          )
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('name');

      if (fetchError) throw new Error(fetchError.message);

      // Get unread counts for each channel
      const channelsWithUnread = await Promise.all(
        (data as ChannelWithMembers[]).map(async (channel) => {
          const { data: unreadCount } = await supabase
            .rpc('get_unread_count', { p_channel_id: channel.id });

          return {
            ...channel,
            unreadCount: unreadCount ?? 0,
          };
        })
      );

      setChannels(channelsWithUnread);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [profile?.workspace_id]);

  // Initial fetch
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Subscribe to channel changes
  useEffect(() => {
    if (!profile?.workspace_id) return;

    const channel = supabase
      .channel('channels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `workspace_id=eq.${profile.workspace_id}`,
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.workspace_id, fetchChannels]);

  const getChannel = useCallback((channelId: string) => {
    return channels.find(c => c.id === channelId);
  }, [channels]);

  const getChannelsByCategory = useCallback((category: string) => {
    return channels.filter(c => c.category === category);
  }, [channels]);

  const createChannel = useCallback(async (
    name: string,
    type: Channel['type'],
    options?: {
      category?: string;
      description?: string;
      isPrivate?: boolean;
      clientId?: string;
    }
  ) => {
    if (!user || !profile?.workspace_id) return null;

    setLoading(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from('channels')
      .insert({
        workspace_id: profile.workspace_id,
        name,
        type,
        category: options?.category ?? 'Workspace',
        description: options?.description,
        is_private: options?.isPrivate ?? false,
        client_id: options?.clientId,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    await fetchChannels();
    setLoading(false);
    return data;
  }, [user, profile?.workspace_id, fetchChannels]);

  const updateChannel = useCallback(async (channelId: string, updates: Partial<Channel>) => {
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', channelId)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setChannels(prev =>
      prev.map(c => c.id === channelId ? { ...c, ...data } : c)
    );
    setLoading(false);
    return data;
  }, []);

  const deleteChannel = useCallback(async (channelId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setChannels(prev => prev.filter(c => c.id !== channelId));
    }

    setLoading(false);
  }, []);

  const joinChannel = useCallback(async (channelId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { error: joinError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: user.id,
      });

    if (joinError) {
      setError(new Error(joinError.message));
    } else {
      await fetchChannels();
    }

    setLoading(false);
  }, [user, fetchChannels]);

  const leaveChannel = useCallback(async (channelId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { error: leaveError } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    if (leaveError) {
      setError(new Error(leaveError.message));
    } else {
      await fetchChannels();
    }

    setLoading(false);
  }, [user, fetchChannels]);

  const muteChannel = useCallback(async (channelId: string, muted: boolean) => {
    if (!user) return;

    setError(null);

    const { error: muteError } = await supabase
      .from('channel_members')
      .update({ is_muted: muted })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    if (muteError) {
      setError(new Error(muteError.message));
    } else {
      setChannels(prev =>
        prev.map(c => {
          if (c.id === channelId) {
            return {
              ...c,
              members: c.members.map(m =>
                m.user_id === user.id ? { ...m, is_muted: muted } : m
              ),
            };
          }
          return c;
        })
      );
    }
  }, [user]);

  const createDM = useCallback(async (otherUserId: string) => {
    if (!user || !profile?.workspace_id) return null;

    setLoading(true);
    setError(null);

    try {
      // Check if DM already exists
      const existingDM = channels.find(c =>
        c.type === 'dm' &&
        c.members.some(m => m.user_id === user.id) &&
        c.members.some(m => m.user_id === otherUserId)
      );

      if (existingDM) {
        setLoading(false);
        return existingDM;
      }

      // Get other user's profile for channel name
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('id', otherUserId)
        .single();

      // Create new DM channel
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({
          workspace_id: profile.workspace_id,
          name: otherProfile?.name ?? 'Direct Message',
          type: 'dm',
          category: 'Direct Messages',
          avatar: otherProfile?.avatar,
          is_private: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw new Error(createError.message);

      // Add other user as member (creator is added via trigger)
      await supabase
        .from('channel_members')
        .insert({
          channel_id: newChannel.id,
          user_id: otherUserId,
        });

      await fetchChannels();
      setLoading(false);
      return newChannel;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [user, profile?.workspace_id, channels, fetchChannels]);

  return {
    channels,
    loading,
    error,
    getChannel,
    getChannelsByCategory,
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    muteChannel,
    createDM,
    refetch: fetchChannels,
  };
}

export default useChannels;
