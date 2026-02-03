# HUBSS - Guida Setup Supabase

Questa guida ti aiuterà a configurare il backend Supabase per HUBSS.

## 1. Creare Progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un account
2. Crea un nuovo progetto
3. Salva la **Project URL** e la **anon key** (Settings > API)

## 2. Configurare Variabili Ambiente

```bash
# Copia il file di esempio
cp .env.example .env.local

# Modifica con i tuoi valori
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=tua-anon-key
```

## 3. Eseguire le Migrations

Vai su **SQL Editor** nel dashboard Supabase ed esegui i file in ordine:

1. `supabase/migrations/001_initial_schema.sql` - Schema database
2. `supabase/migrations/002_rls_policies.sql` - Politiche RLS
3. `supabase/migrations/003_triggers.sql` - Triggers e funzioni
4. `supabase/migrations/004_storage.sql` - Buckets storage
5. `supabase/migrations/005_seed_data.sql` - Dati iniziali

## 4. Configurare Authentication

### Email/Password
Già abilitato di default.

### Google OAuth
1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un progetto o selezionane uno esistente
3. Vai su **APIs & Services > Credentials**
4. Crea **OAuth 2.0 Client ID** (Web application)
5. Aggiungi URI di redirect: `https://tuo-progetto.supabase.co/auth/v1/callback`
6. Copia **Client ID** e **Client Secret**
7. In Supabase Dashboard: **Authentication > Providers > Google**
8. Incolla Client ID e Secret

### Apple Sign In
1. Vai su [Apple Developer Portal](https://developer.apple.com)
2. Crea un **Services ID** per Sign In with Apple
3. Configura il return URL: `https://tuo-progetto.supabase.co/auth/v1/callback`
4. Genera una chiave segreta
5. In Supabase Dashboard: **Authentication > Providers > Apple**
6. Configura con Service ID e chiave

## 5. Configurare Storage

I bucket sono creati automaticamente dalla migration `004_storage.sql`.
Verifica in **Storage** che esistano:
- `avatars` (pubblico)
- `workspace-logos` (pubblico)
- `task-attachments` (privato)
- `client-files` (privato)
- `chat-attachments` (privato)

## 6. Configurare Realtime

1. Vai su **Database > Replication**
2. Abilita realtime per le tabelle:
   - `messages`
   - `tasks`
   - `notifications`
   - `profiles`
   - `channel_members`

## 7. Deploy Edge Functions

### Configurare Secrets
In **Edge Functions > Secrets** aggiungi:
- `GEMINI_API_KEY` - Da Google AI Studio
- `RESEND_API_KEY` - Da [Resend](https://resend.com)
- `FROM_EMAIL` - Email mittente

### Deploy
```bash
# Installa Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al progetto
supabase link --project-ref tuo-project-ref

# Deploy functions
supabase functions deploy ai-proxy
supabase functions deploy send-notification-email
```

## 8. Avviare l'App

```bash
# Installa dipendenze
npm install

# Avvia dev server
npm run dev
```

## Struttura File Creati

```
hubss/
├── src/
│   ├── lib/
│   │   └── supabase.ts              # Client Supabase
│   ├── hooks/
│   │   └── supabase/
│   │       ├── index.ts             # Export centrale
│   │       ├── useAuth.ts           # Autenticazione
│   │       ├── useUser.ts           # Profilo utente
│   │       ├── useWorkspace.ts      # Workspace e membri
│   │       ├── useBoards.ts         # Board Kanban
│   │       ├── useTasks.ts          # Task con realtime
│   │       ├── useChat.ts           # Messaggi chat
│   │       ├── useChannels.ts       # Canali
│   │       ├── useClients.ts        # CRM clienti
│   │       ├── useTimeLogs.ts       # Time tracking
│   │       ├── usePresence.ts       # Status online
│   │       ├── useStorage.ts        # Upload file
│   │       └── useNotifications.ts  # Notifiche
│   ├── contexts/
│   │   └── AuthContext.tsx          # Context auth
│   ├── pages/
│   │   └── AuthCallback.tsx         # OAuth callback
│   └── types/
│       └── supabase.ts              # TypeScript types
├── supabase/
│   ├── config.toml                  # Config locale
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # 24 tabelle
│   │   ├── 002_rls_policies.sql     # 50+ policies
│   │   ├── 003_triggers.sql         # Triggers
│   │   ├── 004_storage.sql          # 5 buckets
│   │   └── 005_seed_data.sql        # Dati iniziali
│   └── functions/
│       ├── ai-proxy/
│       │   └── index.ts             # Proxy Gemini AI
│       └── send-notification-email/
│           └── index.ts             # Email transazionali
├── .env.example                     # Template variabili
└── SUPABASE_SETUP.md               # Questa guida
```

## Utilizzo Hooks

```tsx
// Importa da un unico punto
import {
  useAuth,
  useUser,
  useWorkspace,
  useBoards,
  useTasks,
  useChat,
  useChannels,
  useClients,
  useTimeLogs,
  usePresence,
  useStorage,
  useNotifications
} from './hooks/supabase';

// Esempio: Auth
function LoginForm() {
  const { signIn, signInWithGoogle, loading, error } = useAuth();

  const handleSubmit = async (email, password) => {
    const { error } = await signIn(email, password);
    if (!error) navigate('/dashboard');
  };
}

// Esempio: Tasks con realtime
function TaskBoard({ boardId }) {
  const { tasks, createTask, moveTask, loading } = useTasks(boardId);

  // tasks si aggiorna automaticamente in realtime!
}

// Esempio: Chat con typing indicator
function ChatInput({ channelId }) {
  const { sendMessage } = useChat(channelId);
  const { startTyping, stopTyping, typingUsers } = useTypingIndicator(channelId);

  return (
    <div>
      {typingUsers.length > 0 && (
        <p>{typingUsers.map(u => u.name).join(', ')} sta scrivendo...</p>
      )}
      <input
        onChange={startTyping}
        onBlur={stopTyping}
      />
    </div>
  );
}

// Esempio: Time Tracking
function TaskTimer({ taskId }) {
  const { runningLog, startTimer, stopTimer, formatDuration } = useTimeLogs(taskId);

  return (
    <button onClick={() => runningLog ? stopTimer() : startTimer(taskId)}>
      {runningLog ? 'Stop' : 'Start'}
    </button>
  );
}
```

## Prossimi Passi

1. **Integrare Auth.tsx** - Sostituisci mock auth con `useAuth`
2. **Integrare ProjectBoard.tsx** - Usa `useTasks` e `useBoards`
3. **Integrare Chat.tsx** - Usa `useChat` e `useChannels`
4. **Rimuovere mock data** da `App.tsx`

## Supporto

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
