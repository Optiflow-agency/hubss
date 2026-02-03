import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadFile, getSignedUrl } from '../../lib/supabase';
import type { Tables } from '../../types/supabase';
import { useAuth } from './useAuth';
import { useUser } from './useUser';

type Client = Tables<'clients'>;
type Milestone = Tables<'milestones'>;
type Ticket = Tables<'tickets'>;
type ClientFile = Tables<'client_files'>;

interface ClientWithRelations extends Client {
  milestones: Milestone[];
  tickets: Ticket[];
  files: ClientFile[];
}

interface UseClientsReturn {
  clients: ClientWithRelations[];
  loading: boolean;
  error: Error | null;
  getClient: (clientId: string) => ClientWithRelations | undefined;
  createClient: (data: {
    name: string;
    company: string;
    email?: string;
    phone?: string;
    project?: string;
  }) => Promise<Client | null>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client | null>;
  deleteClient: (clientId: string) => Promise<void>;
  grantAccess: (clientId: string, userId: string) => Promise<void>;
  revokeAccess: (clientId: string, userId: string) => Promise<void>;
  // Milestones
  createMilestone: (clientId: string, title: string, dueDate?: string) => Promise<Milestone | null>;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
  // Tickets
  createTicket: (clientId: string, data: {
    subject: string;
    type: Ticket['type'];
    priority?: Ticket['priority'];
    description?: string;
  }) => Promise<Ticket | null>;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  // Files
  uploadClientFile: (clientId: string, file: File) => Promise<ClientFile | null>;
  deleteClientFile: (fileId: string) => Promise<void>;
  getFileUrl: (clientId: string, fileName: string) => Promise<string | null>;
  refetch: () => Promise<void>;
}

export function useClients(): UseClientsReturn {
  const { user } = useAuth();
  const { profile } = useUser();
  const [clients, setClients] = useState<ClientWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = useCallback(async () => {
    if (!profile?.workspace_id) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select(`
          *,
          milestones(*),
          tickets(*),
          files:client_files(*)
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('company');

      if (fetchError) throw new Error(fetchError.message);

      setClients(data as ClientWithRelations[]);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [profile?.workspace_id]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Subscribe to changes
  useEffect(() => {
    if (!profile?.workspace_id) return;

    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `workspace_id=eq.${profile.workspace_id}`,
        },
        () => fetchClients()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
        },
        () => fetchClients()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => fetchClients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.workspace_id, fetchClients]);

  const getClient = useCallback((clientId: string) => {
    return clients.find(c => c.id === clientId);
  }, [clients]);

  const createClient = useCallback(async (data: {
    name: string;
    company: string;
    email?: string;
    phone?: string;
    project?: string;
  }) => {
    if (!user || !profile?.workspace_id) return null;

    setLoading(true);
    setError(null);

    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        workspace_id: profile.workspace_id,
        owner_id: user.id,
        ...data,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    // Grant access to the creator
    await supabase
      .from('user_client_access')
      .insert({
        user_id: user.id,
        client_id: newClient.id,
        granted_by: user.id,
      });

    await fetchClients();
    setLoading(false);
    return newClient;
  }, [user, profile?.workspace_id, fetchClients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setLoading(false);
    return data;
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setClients(prev => prev.filter(c => c.id !== clientId));
    }

    setLoading(false);
  }, []);

  const grantAccess = useCallback(async (clientId: string, userId: string) => {
    if (!user) return;

    setError(null);

    const { error: grantError } = await supabase
      .from('user_client_access')
      .insert({
        user_id: userId,
        client_id: clientId,
        granted_by: user.id,
      });

    if (grantError) {
      setError(new Error(grantError.message));
    }
  }, [user]);

  const revokeAccess = useCallback(async (clientId: string, userId: string) => {
    setError(null);

    const { error: revokeError } = await supabase
      .from('user_client_access')
      .delete()
      .eq('user_id', userId)
      .eq('client_id', clientId);

    if (revokeError) {
      setError(new Error(revokeError.message));
    }
  }, []);

  // Milestones
  const createMilestone = useCallback(async (
    clientId: string,
    title: string,
    dueDate?: string
  ) => {
    setError(null);

    const { data, error: createError } = await supabase
      .from('milestones')
      .insert({
        client_id: clientId,
        title,
        due_date: dueDate,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      return null;
    }

    return data;
  }, []);

  const updateMilestone = useCallback(async (milestoneId: string, updates: Partial<Milestone>) => {
    setError(null);

    const { error: updateError } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', milestoneId);

    if (updateError) {
      setError(new Error(updateError.message));
    }
  }, []);

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    setError(null);

    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    }
  }, []);

  // Tickets
  const createTicket = useCallback(async (
    clientId: string,
    data: {
      subject: string;
      type: Ticket['type'];
      priority?: Ticket['priority'];
      description?: string;
    }
  ) => {
    if (!user) return null;

    setError(null);

    const { data: ticket, error: createError } = await supabase
      .from('tickets')
      .insert({
        client_id: clientId,
        created_by: user.id,
        ...data,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      return null;
    }

    return ticket;
  }, [user]);

  const updateTicket = useCallback(async (ticketId: string, updates: Partial<Ticket>) => {
    setError(null);

    // If status is being set to completed, set resolved_at
    if (updates.status === 'Completata') {
      updates = { ...updates, resolved_at: new Date().toISOString() };
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId);

    if (updateError) {
      setError(new Error(updateError.message));
    }
  }, []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    setError(null);

    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    }
  }, []);

  // Files
  const uploadClientFile = useCallback(async (clientId: string, file: File) => {
    if (!user || !profile?.workspace_id) return null;

    setLoading(true);
    setError(null);

    try {
      const filePath = `${profile.workspace_id}/${clientId}/${file.name}`;
      await uploadFile('client-files', filePath, file);

      // Determine file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: ClientFile['type'] = 'doc';
      if (ext === 'pdf') fileType = 'pdf';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) fileType = 'img';
      else if (ext === 'zip') fileType = 'zip';

      // Format size
      const sizeDisplay = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const { data: clientFile, error: insertError } = await supabase
        .from('client_files')
        .insert({
          client_id: clientId,
          name: file.name,
          type: fileType,
          url: filePath, // Store path, not URL
          size_bytes: file.size,
          size_display: sizeDisplay,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      await fetchClients();
      setLoading(false);
      return clientFile;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [user, profile?.workspace_id, fetchClients]);

  const deleteClientFile = useCallback(async (fileId: string) => {
    setError(null);

    // Get file info first
    const { data: fileInfo } = await supabase
      .from('client_files')
      .select('url')
      .eq('id', fileId)
      .single();

    if (fileInfo) {
      // Delete from storage
      await supabase.storage.from('client-files').remove([fileInfo.url]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('client_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      await fetchClients();
    }
  }, [fetchClients]);

  const getFileUrl = useCallback(async (clientId: string, fileName: string) => {
    if (!profile?.workspace_id) return null;

    const filePath = `${profile.workspace_id}/${clientId}/${fileName}`;
    return getSignedUrl('client-files', filePath);
  }, [profile?.workspace_id]);

  return {
    clients,
    loading,
    error,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    grantAccess,
    revokeAccess,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    createTicket,
    updateTicket,
    deleteTicket,
    uploadClientFile,
    deleteClientFile,
    getFileUrl,
    refetch: fetchClients,
  };
}

export default useClients;
