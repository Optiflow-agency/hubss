// Generated types for Supabase database
// Run `npx supabase gen types typescript` to regenerate after schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          workspace_id: string | null
          name: string
          email: string
          avatar: string | null
          avatar_config: Json | null
          status: 'online' | 'busy' | 'offline' | 'away'
          role: string | null
          accessible_clients: string[]
          settings: Json
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          workspace_id?: string | null
          name: string
          email: string
          avatar?: string | null
          avatar_config?: Json | null
          status?: 'online' | 'busy' | 'offline' | 'away'
          role?: string | null
          accessible_clients?: string[]
          settings?: Json
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          name?: string
          email?: string
          avatar?: string | null
          avatar_config?: Json | null
          status?: 'online' | 'busy' | 'offline' | 'away'
          role?: string | null
          accessible_clients?: string[]
          settings?: Json
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role_id: string | null
          is_owner: boolean
          is_admin: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role_id?: string | null
          is_owner?: boolean
          is_admin?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role_id?: string | null
          is_owner?: boolean
          is_admin?: boolean
          joined_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          is_system: boolean
          permissions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          is_system?: boolean
          permissions?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          is_system?: boolean
          permissions?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          label: string
          description: string | null
          category: string
        }
        Insert: {
          id: string
          label: string
          description?: string | null
          category: string
        }
        Update: {
          id?: string
          label?: string
          description?: string | null
          category?: string
        }
      }
      boards: {
        Row: {
          id: string
          workspace_id: string
          title: string
          description: string | null
          client_id: string | null
          columns: Json
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          description?: string | null
          client_id?: string | null
          columns?: Json
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          description?: string | null
          client_id?: string | null
          columns?: Json
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      board_members: {
        Row: {
          id: string
          board_id: string
          user_id: string
          can_edit: boolean
          added_at: string
        }
        Insert: {
          id?: string
          board_id: string
          user_id: string
          can_edit?: boolean
          added_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string
          can_edit?: boolean
          added_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          board_id: string
          title: string
          description: string | null
          status: string
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          due_date: string | null
          tags: string[]
          checklist: Json
          cover: string | null
          client_visible: boolean
          effort: number | null
          actual_effort: number | null
          is_blocked: boolean
          rework_count: number
          completed_at: string | null
          total_time_spent: number
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          title: string
          description?: string | null
          status: string
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          due_date?: string | null
          tags?: string[]
          checklist?: Json
          cover?: string | null
          client_visible?: boolean
          effort?: number | null
          actual_effort?: number | null
          is_blocked?: boolean
          rework_count?: number
          completed_at?: string | null
          total_time_spent?: number
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          due_date?: string | null
          tags?: string[]
          checklist?: Json
          cover?: string | null
          client_visible?: boolean
          effort?: number | null
          actual_effort?: number | null
          is_blocked?: boolean
          rework_count?: number
          completed_at?: string | null
          total_time_spent?: number
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_assignees: {
        Row: {
          id: string
          task_id: string
          user_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          assigned_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          assigned_at?: string
        }
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          name: string
          url: string
          type: 'image' | 'file'
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          name: string
          url: string
          type: 'image' | 'file'
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          name?: string
          url?: string
          type?: 'image' | 'file'
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      time_logs: {
        Row: {
          id: string
          task_id: string
          user_id: string
          start_time: string
          end_time: string | null
          duration: number
          description: string | null
          is_manual: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          start_time: string
          end_time?: string | null
          duration?: number
          description?: string | null
          is_manual?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          duration?: number
          description?: string | null
          is_manual?: boolean
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          workspace_id: string
          name: string
          company: string
          email: string | null
          phone: string | null
          avatar: string | null
          project: string | null
          status: 'active' | 'pending' | 'completed' | 'archived'
          owner_id: string | null
          settings: Json
          last_access: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          company: string
          email?: string | null
          phone?: string | null
          avatar?: string | null
          project?: string | null
          status?: 'active' | 'pending' | 'completed' | 'archived'
          owner_id?: string | null
          settings?: Json
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          company?: string
          email?: string | null
          phone?: string | null
          avatar?: string | null
          project?: string | null
          status?: 'active' | 'pending' | 'completed' | 'archived'
          owner_id?: string | null
          settings?: Json
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_client_access: {
        Row: {
          id: string
          user_id: string
          client_id: string
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          granted_at?: string
          granted_by?: string | null
        }
      }
      milestones: {
        Row: {
          id: string
          client_id: string
          board_id: string | null
          title: string
          description: string | null
          status: 'completed' | 'in_progress' | 'pending'
          due_date: string | null
          completed_at: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          board_id?: string | null
          title: string
          description?: string | null
          status?: 'completed' | 'in_progress' | 'pending'
          due_date?: string | null
          completed_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          board_id?: string | null
          title?: string
          description?: string | null
          status?: 'completed' | 'in_progress' | 'pending'
          due_date?: string | null
          completed_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          client_id: string
          subject: string
          description: string | null
          type: 'Domanda' | 'Modifica' | 'Bug' | 'Feature'
          status: 'Ricevuta' | 'In Lavorazione' | 'Completata'
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to: string | null
          resolved_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          subject: string
          description?: string | null
          type: 'Domanda' | 'Modifica' | 'Bug' | 'Feature'
          status?: 'Ricevuta' | 'In Lavorazione' | 'Completata'
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to?: string | null
          resolved_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          subject?: string
          description?: string | null
          type?: 'Domanda' | 'Modifica' | 'Bug' | 'Feature'
          status?: 'Ricevuta' | 'In Lavorazione' | 'Completata'
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to?: string | null
          resolved_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_files: {
        Row: {
          id: string
          client_id: string
          name: string
          type: 'pdf' | 'img' | 'doc' | 'zip'
          url: string
          size_bytes: number | null
          size_display: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          type: 'pdf' | 'img' | 'doc' | 'zip'
          url: string
          size_bytes?: number | null
          size_display?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          type?: 'pdf' | 'img' | 'doc' | 'zip'
          url?: string
          size_bytes?: number | null
          size_display?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          workspace_id: string
          name: string
          type: 'channel' | 'dm' | 'ai'
          category: string | null
          description: string | null
          avatar: string | null
          is_private: boolean
          client_id: string | null
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          type?: 'channel' | 'dm' | 'ai'
          category?: string | null
          description?: string | null
          avatar?: string | null
          is_private?: boolean
          client_id?: string | null
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          type?: 'channel' | 'dm' | 'ai'
          category?: string | null
          description?: string | null
          avatar?: string | null
          is_private?: boolean
          client_id?: string | null
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          is_muted: boolean
          last_read_at: string
          joined_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          is_muted?: boolean
          last_read_at?: string
          joined_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          is_muted?: boolean
          last_read_at?: string
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string | null
          content: string
          is_ai: boolean
          thread_id: string | null
          reply_count: number
          reactions: Json
          pinned: boolean
          attachments: Json
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id?: string | null
          content: string
          is_ai?: boolean
          thread_id?: string | null
          reply_count?: number
          reactions?: Json
          pinned?: boolean
          attachments?: Json
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          sender_id?: string | null
          content?: string
          is_ai?: boolean
          thread_id?: string | null
          reply_count?: number
          reactions?: Json
          pinned?: boolean
          attachments?: Json
          edited_at?: string | null
          created_at?: string
        }
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          workspace_id: string
          title: string
          icon: string
          blocks: Json
          parent_id: string | null
          is_template: boolean
          created_by: string | null
          last_edited_by: string | null
          last_edited_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          icon?: string
          blocks?: Json
          parent_id?: string | null
          is_template?: boolean
          created_by?: string | null
          last_edited_by?: string | null
          last_edited_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          icon?: string
          blocks?: Json
          parent_id?: string | null
          is_template?: boolean
          created_by?: string | null
          last_edited_by?: string | null
          last_edited_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          provider: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[]
          settings: Json
          connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          provider: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          settings?: Json
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          settings?: Json
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          channel_id: string | null
          workspace_id: string
          type: 'audio' | 'video'
          status: 'dialing' | 'connected' | 'ended'
          started_by: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          channel_id?: string | null
          workspace_id: string
          type: 'audio' | 'video'
          status?: 'dialing' | 'connected' | 'ended'
          started_by?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
        }
        Update: {
          id?: string
          channel_id?: string | null
          workspace_id?: string
          type?: 'audio' | 'video'
          status?: 'dialing' | 'connected' | 'ended'
          started_by?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
        }
      }
      call_participants: {
        Row: {
          id: string
          call_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          is_muted: boolean
          is_video_off: boolean
        }
        Insert: {
          id?: string
          call_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
          is_muted?: boolean
          is_video_off?: boolean
        }
        Update: {
          id?: string
          call_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
          is_muted?: boolean
          is_video_off?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      is_workspace_member: {
        Args: { ws_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { ws_id: string; permission_name: string }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { ws_id: string }
        Returns: boolean
      }
      has_client_access: {
        Args: { c_id: string }
        Returns: boolean
      }
      is_board_member: {
        Args: { b_id: string }
        Returns: boolean
      }
      is_channel_member: {
        Args: { ch_id: string }
        Returns: boolean
      }
      get_current_workspace: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_running_time_log: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['time_logs']['Row'][]
      }
      stop_running_time_logs: {
        Args: Record<string, never>
        Returns: number
      }
      get_unread_count: {
        Args: { p_channel_id: string }
        Returns: number
      }
      setup_new_workspace: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_body?: string | null
          p_data?: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_status: 'online' | 'busy' | 'offline' | 'away'
      task_priority: 'Low' | 'Medium' | 'High' | 'Critical'
      client_status: 'active' | 'pending' | 'completed' | 'archived'
      channel_type: 'channel' | 'dm' | 'ai'
      ticket_type: 'Domanda' | 'Modifica' | 'Bug' | 'Feature'
      ticket_status: 'Ricevuta' | 'In Lavorazione' | 'Completata'
      milestone_status: 'completed' | 'in_progress' | 'pending'
      attachment_type: 'image' | 'file'
      file_type: 'pdf' | 'img' | 'doc' | 'zip'
      call_type: 'audio' | 'video'
      call_status: 'dialing' | 'connected' | 'ended'
    }
  }
}

// Utility types for easier access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Profile = Tables<'profiles'>
export type Workspace = Tables<'workspaces'>
export type Board = Tables<'boards'>
export type Task = Tables<'tasks'>
export type Channel = Tables<'channels'>
export type Message = Tables<'messages'>
export type Client = Tables<'clients'>
export type TimeLog = Tables<'time_logs'>
export type Notification = Tables<'notifications'>
