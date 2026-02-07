import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

// OAuth Callback Handler
// This component handles the redirect back from OAuth providers (Google, Apple)
export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The Supabase client with detectSessionInUrl:true will automatically
        // exchange the PKCE code from the URL for a session
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) {
          throw authError;
        }

        if (session) {
          // Check if user has a workspace
          const { data: profile } = await supabase
            .from('profiles')
            .select('workspace_id')
            .eq('id', session.user.id)
            .single();

          if (profile?.workspace_id) {
            // User has a workspace, redirect to dashboard
            navigate('/', { replace: true });
          } else {
            // New user, redirect to onboarding
            navigate('/?onboarding=true', { replace: true });
          }
        } else {
          // No session, redirect to login
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Errore durante l\'autenticazione');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Errore di autenticazione
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Autenticazione in corso...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Attendi mentre completiamo l'accesso
        </p>
      </div>
    </div>
  );
}

export default AuthCallback;
