// Supabase Hooks - Export all hooks from a single entry point

export { useAuth, useRequireAuth } from './useAuth';
export { useUser } from './useUser';
export { useWorkspace } from './useWorkspace';
export { useBoards } from './useBoards';
export { useTasks } from './useTasks';
export { useChat } from './useChat';
export { useChannels } from './useChannels';
export { useClients } from './useClients';
export { useTimeLogs, formatDuration } from './useTimeLogs';
export { usePresence, useTypingIndicator } from './usePresence';
export { useStorage, useFileDropzone } from './useStorage';
export { useNotifications } from './useNotifications';

// Re-export types
export type { Database, Tables, Profile, Workspace, Board, Task, Channel, Message, Client, TimeLog, Notification } from '../../types/supabase';
