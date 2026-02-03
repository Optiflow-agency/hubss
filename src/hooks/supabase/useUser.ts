import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadFile, getPublicUrl } from '../../lib/supabase';
import type { Profile } from '../../types/supabase';
import { useAuth } from './useAuth';

interface UseUserReturn {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  updateAvatar: (file: File) => Promise<string | null>;
  updateStatus: (status: Profile['status']) => Promise<void>;
  updateAvatarConfig: (config: Record<string, unknown>) => Promise<void>;
}

export function useUser(): UseUserReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        setError(new Error(fetchError.message));
        setProfile(null);
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setProfile(data);
    setLoading(false);
    return data;
  }, [user]);

  const updateAvatar = useCallback(async (file: File) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      await uploadFile('avatars', filePath, file, { upsert: true });

      // Get public URL
      const publicUrl = getPublicUrl('avatars', filePath);

      // Update profile with new avatar URL
      await updateProfile({ avatar: publicUrl });

      setLoading(false);
      return publicUrl;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [user, updateProfile]);

  const updateStatus = useCallback(async (status: Profile['status']) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('id', user.id);
  }, [user]);

  const updateAvatarConfig = useCallback(async (config: Record<string, unknown>) => {
    if (!user) return;

    await updateProfile({
      avatar_config: config,
      // Generate DiceBear URL from config
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.seed}&${new URLSearchParams(
        Object.entries(config)
          .filter(([key]) => key !== 'seed' && key !== 'style' && key !== 'gender')
          .map(([key, value]) => [key, String(value)])
      ).toString()}`,
    });
  }, [user, updateProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
    updateStatus,
    updateAvatarConfig,
  };
}

export default useUser;
