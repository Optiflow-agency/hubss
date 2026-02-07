import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, signInWithOAuth } from '../../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        error: error as AuthError | null,
      }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));

        // Handle specific events
        if (event === 'SIGNED_IN') {
          // User signed in - could trigger workspace setup check
          console.log('User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          // User signed out - clear any cached data
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await signIn(email, password);

      setState(prev => ({
        ...prev,
        user: data?.user ?? null,
        session: data?.session ?? null,
        loading: false,
        error: error as AuthError | null,
      }));

      return { user: data?.user ?? null, error: error as AuthError | null };
    } catch (err) {
      const authError = err as AuthError;
      setState(prev => ({ ...prev, loading: false, error: authError }));
      return { user: null, error: authError };
    }
  }, []);

  const handleSignUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await signUp(email, password, metadata);

      setState(prev => ({
        ...prev,
        user: data?.user ?? null,
        session: data?.session ?? null,
        loading: false,
        error: error as AuthError | null,
      }));

      return { user: data?.user ?? null, error: error as AuthError | null };
    } catch (err) {
      const authError = err as AuthError;
      setState(prev => ({ ...prev, loading: false, error: authError }));
      return { user: null, error: authError };
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await signOut();

    setState({
      user: null,
      session: null,
      loading: false,
      error: error as AuthError | null,
    });

    return { error: error as AuthError | null };
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await signInWithOAuth('google');

    if (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
    }
    // If successful, the page will redirect to Google
  }, []);

  const handleSignInWithApple = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await signInWithOAuth('apple');

    if (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
    }
    // If successful, the page will redirect to Apple
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setState(prev => ({
      ...prev,
      loading: false,
      error: error as AuthError | null,
    }));

    return { error: error as AuthError | null };
  }, []);

  const handleUpdatePassword = useCallback(async (newPassword: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setState(prev => ({
      ...prev,
      loading: false,
      error: error as AuthError | null,
    }));

    return { error: error as AuthError | null };
  }, []);

  const refreshSession = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    const { data: { session }, error } = await supabase.auth.refreshSession();

    setState(prev => ({
      ...prev,
      user: session?.user ?? null,
      session,
      loading: false,
      error: error as AuthError | null,
    }));
  }, []);

  return {
    ...state,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    refreshSession,
  };
}

// Hook for protecting routes
export function useRequireAuth(redirectTo = '/auth') {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}

export default useAuth;
