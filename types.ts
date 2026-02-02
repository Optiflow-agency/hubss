
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
// Changed from union type to string to support dynamic columns
export type Status = string; 

export interface AvatarConfig {
  style: 'avataaars';
  seed: string;
  top: string;          // hair/hat style
  accessories: string;  // glasses
  hairColor: string;
  facialHair: string;   // beard/mustache
  clothing: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  skinColor: string;
  // UI Helper (not sent to API, but useful for editor state)
  gender?: 'man' | 'woman'; 
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string; // URL string
  avatarConfig?: AvatarConfig; // Configuration object for reconstruction
  status?: 'online' | 'busy' | 'offline';
  role?: string; // Links to RoleDefinition.name
  accessibleClients: string[]; // List of Client IDs this user can see/chat with
}

// --- ROLE & PERMISSION SYSTEM ---

export type PermissionCategory = 'General' | 'Projects' | 'Clients' | 'Team';

export interface PermissionItem {
    id: string;
    label: string;
    description: string;
    category: PermissionCategory;
}

export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean; // If true, cannot be deleted (e.g. Admin)
    permissions: string[]; // Array of Permission IDs enabled for this role
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
}

// --- TIME TRACKING ---
export interface TimeLog {
    id: string;
    taskId: string;
    userId: string;
    startTime: number; // timestamp ms
    endTime: number | null; // null if currently running
    duration: number; // calculated in ms (0 if running)
    description?: string; // Manual entry note
    isManual: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status; // Now links to Column ID or Title
  priority: Priority;
  assignees: User[];
  dueDate: string;
  comments: number;
  tags: string[];
  checklist?: ChecklistItem[]; 
  cover?: string; // Hex color or class
  attachments?: Attachment[];
  clientVisible?: boolean;
  
  // NEW ANALYTICS FIELDS
  effort?: number; // Estimated hours
  actualEffort?: number; // Actual hours spent (derived from logs)
  isBlocked?: boolean; // If true, task is stalled
  reworkCount?: number; // How many times task moved back from Done
  completedAt?: string; // ISO date when task was marked done
  
  // Time tracking aggregates (calculated on fly usually, but good for UI)
  totalTimeSpent?: number; // ms
}

export interface BoardColumn {
    id: string;
    title: string;
    color?: string; // Optional accent color
}

export interface Board {
    id: string;
    title: string;
    description: string;
    client?: string; // Added client linkage
    columns: BoardColumn[];
    tasks: Task[];
    members: User[]; // Members specific to this board
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  members: User[];
  status: 'Active' | 'On Hold' | 'Completed';
}

export interface Reaction {
    emoji: string;
    userId: string;
    count: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isAi?: boolean;
  threadId?: string; // ID of the parent message if this is a reply
  replyCount?: number; // Number of replies in the thread
  reactions?: Reaction[]; // Array of reactions
  pinned?: boolean; // New field for pinned messages
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm' | 'ai';
  category?: string; // e.g., "Workspace", "Acme Corp", "Direct Messages"
  avatar?: string;
  status?: 'online' | 'offline';
  lastMessage?: string;
  unread?: number;
}

// Block Types for Documents
export type BlockType = 
  | 'text' | 'h1' | 'h2' | 'h3' | 'bullet' 
  | 'divider' | 'callout' | 'toc'
  | 'embed_google_doc' | 'embed_google_sheet' | 'embed_figma' | 'embed_maps' | 'embed_miro' | 'embed_loom' | 'embed_codepen' | 'embed_pdf' | 'embed_youtube'
  | 'db_table' | 'db_board' | 'db_gallery' | 'db_calendar' | 'db_timeline';

export interface Block {
  id: string;
  type: BlockType;
  content?: string;
  properties?: any;
}

export interface Document {
  id: string;
  title: string;
  icon: string;
  blocks: Block[];
  lastEdited: string;
}

// --- CLIENT PORTAL TYPES ---

export interface Client {
    id: string;
    name: string; // Internal Contact Name or Description
    company: string;
    avatar: string;
    project: string; // Current main project associated
    status: 'active' | 'pending' | 'completed';
    lastAccess: string;
    owner?: string; // The team member who created/manages this client
}

export interface Milestone {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  date: string;
}

export interface Ticket {
  id: string;
  subject: string;
  type: 'Domanda' | 'Modifica' | 'Bug' | 'Feature';
  status: 'Ricevuta' | 'In Lavorazione' | 'Completata';
  priority: Priority;
  date: string;
}

export interface ClientFile {
  id: string;
  name: string;
  type: 'pdf' | 'img' | 'doc' | 'zip';
  size: string;
  date: string;
  uploadedBy: string;
}

// --- INTEGRATION TYPES ---

export type IntegrationCategory = 'productivity' | 'communication' | 'dev' | 'design' | 'crm' | 'finance';

export interface IntegrationFeature {
  id: string;
  label: string;
  enabled: boolean;
  description?: string;
}

export interface IntegrationApp {
  id: string;
  name: string;
  icon: string;
  category: IntegrationCategory;
  description: string;
  connected: boolean;
  permissions: string[]; // List of OAuth scopes to request
  features: IntegrationFeature[]; // Toggleable settings after connection
}

// --- CALL TYPES ---

export type CallStatus = 'dialing' | 'connected' | 'ended';

export interface CallSession {
  isActive: boolean;
  type: 'audio' | 'video';
  status: CallStatus;
  participants: User[]; // Who is in the call
  startTime?: number; // Timestamp when connected
  isMinimized?: boolean;
}
