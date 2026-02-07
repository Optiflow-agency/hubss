import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING');
console.log('[Supabase] Key length:', supabaseAnonKey.length);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Auth helpers
export const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signInWithOAuth = async (provider: 'google' | 'apple') => {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: provider === 'apple' ? {
        // Apple-specific params for name/email sharing
        response_mode: 'form_post',
      } : undefined,
    },
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Storage helpers
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: options?.upsert ?? false,
    });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const getSignedUrl = async (bucket: string, path: string, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
};

export const deleteFile = async (bucket: string, paths: string[]) => {
  const { data, error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
  return data;
};

// Realtime subscription factory
export const subscribeToChannel = <T>(
  channelName: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  table: string,
  filter: string | undefined,
  callback: (payload: T) => void
) => {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        filter,
      },
      (payload) => callback(payload as T)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Presence helpers
export const trackPresence = (
  channelName: string,
  userId: string,
  initialState: Record<string, unknown>
) => {
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(initialState);
    }
  });

  return {
    channel,
    updatePresence: (state: Record<string, unknown>) => channel.track(state),
    unsubscribe: () => supabase.removeChannel(channel),
  };
};

// Broadcast helpers for typing indicators etc.
export const broadcastEvent = (
  channelName: string,
  event: string,
  payload: Record<string, unknown>
) => {
  const channel = supabase.channel(channelName);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  });

  return () => supabase.removeChannel(channel);
};

// Edge Function caller
export const callEdgeFunction = async <T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  });

  if (error) throw error;
  return data as T;
};

export default supabase;
