import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadFile, getPublicUrl } from '../../lib/supabase';
import type { Workspace, Profile, Tables } from '../../types/supabase';
import { useAuth } from './useAuth';

type WorkspaceMember = Tables<'workspace_members'> & {
  profile: Profile;
  role: Tables<'roles'> | null;
};

type Role = Tables<'roles'>;

interface UseWorkspaceReturn {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  roles: Role[];
  loading: boolean;
  error: Error | null;
  isOwner: boolean;
  isAdmin: boolean;
  createWorkspace: (name: string, slug: string) => Promise<Workspace | null>;
  updateWorkspace: (updates: Partial<Workspace>) => Promise<Workspace | null>;
  updateWorkspaceLogo: (file: File) => Promise<string | null>;
  inviteMember: (email: string, roleId?: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, roleId: string) => Promise<void>;
  createRole: (name: string, description: string, permissions: string[]) => Promise<Role | null>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<Role | null>;
  deleteRole: (roleId: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  fetchWorkspaces: () => Promise<Workspace[]>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [membership, setMembership] = useState<Tables<'workspace_members'> | null>(null);

  // Fetch workspace when user changes
  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setMembers([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchWorkspaceData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get user's profile to find their workspace
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.workspace_id) {
          setLoading(false);
          return;
        }

        // Fetch workspace
        const { data: ws, error: wsError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', profile.workspace_id)
          .single();

        if (wsError) throw new Error(wsError.message);
        setWorkspace(ws);

        // Fetch workspace members with their profiles
        const { data: membersData, error: membersError } = await supabase
          .from('workspace_members')
          .select(`
            *,
            profile:profiles(*),
            role:roles(*)
          `)
          .eq('workspace_id', profile.workspace_id);

        if (membersError) throw new Error(membersError.message);
        setMembers(membersData as WorkspaceMember[]);

        // Find current user's membership
        const currentMembership = membersData?.find(m => m.user_id === user.id);
        setMembership(currentMembership || null);

        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .eq('workspace_id', profile.workspace_id)
          .order('name');

        if (rolesError) throw new Error(rolesError.message);
        setRoles(rolesData);

      } catch (err) {
        setError(err as Error);
      }

      setLoading(false);
    };

    fetchWorkspaceData();

    // Subscribe to workspace changes
    const workspaceChannel = supabase
      .channel('workspace-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
        },
        () => {
          fetchWorkspaceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workspaceChannel);
    };
  }, [user]);

  const createWorkspace = useCallback(async (name: string, slug: string) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      // Use the setup function that creates workspace + default roles + channels
      const { data: workspaceId, error: setupError } = await supabase
        .rpc('setup_new_workspace', { p_name: name, p_slug: slug });

      if (setupError) throw new Error(setupError.message);

      // Fetch the created workspace
      const { data: newWorkspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      setWorkspace(newWorkspace);
      setLoading(false);
      return newWorkspace;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [user]);

  const updateWorkspace = useCallback(async (updates: Partial<Workspace>) => {
    if (!workspace) return null;

    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspace.id)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setWorkspace(data);
    setLoading(false);
    return data;
  }, [workspace]);

  const updateWorkspaceLogo = useCallback(async (file: File) => {
    if (!workspace) return null;

    setLoading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${workspace.id}/logo.${fileExt}`;

      await uploadFile('workspace-logos', filePath, file, { upsert: true });
      const publicUrl = getPublicUrl('workspace-logos', filePath);

      await updateWorkspace({ logo_url: publicUrl });

      setLoading(false);
      return publicUrl;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [workspace, updateWorkspace]);

  const inviteMember = useCallback(async (email: string, roleId?: string) => {
    if (!workspace) return;

    setLoading(true);
    setError(null);

    try {
      // Find user by email
      const { data: invitee, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (findError) {
        // User doesn't exist - could send invite email here
        throw new Error('Utente non trovato. Assicurati che si sia registrato.');
      }

      // Add as workspace member
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: invitee.id,
          role_id: roleId,
        });

      if (addError) throw new Error(addError.message);

      // Update user's profile to link to this workspace
      await supabase
        .from('profiles')
        .update({ workspace_id: workspace.id })
        .eq('id', invitee.id);

    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [workspace]);

  const removeMember = useCallback(async (userId: string) => {
    if (!workspace) return;

    setLoading(true);
    setError(null);

    try {
      const { error: removeError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('user_id', userId);

      if (removeError) throw new Error(removeError.message);

      // Clear user's workspace reference
      await supabase
        .from('profiles')
        .update({ workspace_id: null })
        .eq('id', userId);

      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [workspace]);

  const updateMemberRole = useCallback(async (userId: string, roleId: string) => {
    if (!workspace) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({ role_id: roleId })
        .eq('workspace_id', workspace.id)
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message);

      // Also update profile role name
      const role = roles.find(r => r.id === roleId);
      if (role) {
        await supabase
          .from('profiles')
          .update({ role: role.name })
          .eq('id', userId);
      }

      setMembers(prev =>
        prev.map(m =>
          m.user_id === userId ? { ...m, role_id: roleId } : m
        )
      );
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [workspace, roles]);

  const createRole = useCallback(async (
    name: string,
    description: string,
    permissions: string[]
  ) => {
    if (!workspace) return null;

    setLoading(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from('roles')
      .insert({
        workspace_id: workspace.id,
        name,
        description,
        permissions,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    setRoles(prev => [...prev, data]);
    setLoading(false);
    return data;
  }, [workspace]);

  const updateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setRoles(prev => prev.map(r => r.id === roleId ? data : r));
    setLoading(false);
    return data;
  }, []);

  const deleteRole = useCallback(async (roleId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }

    setLoading(false);
  }, []);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Update user's profile to point to new workspace
      await supabase
        .from('profiles')
        .update({ workspace_id: workspaceId })
        .eq('id', user.id);

      // Force re-fetch by clearing current state
      setWorkspace(null);
      setMembers([]);
      setRoles([]);

      // Data will be re-fetched by the useEffect
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [user]);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return [];

    const { data, error: fetchError } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(*)')
      .eq('user_id', user.id);

    if (fetchError) {
      setError(new Error(fetchError.message));
      return [];
    }

    return (data?.map(d => d.workspace) ?? []) as Workspace[];
  }, [user]);

  return {
    workspace,
    members,
    roles,
    loading,
    error,
    isOwner: membership?.is_owner ?? false,
    isAdmin: membership?.is_admin ?? false,
    createWorkspace,
    updateWorkspace,
    updateWorkspaceLogo,
    inviteMember,
    removeMember,
    updateMemberRole,
    createRole,
    updateRole,
    deleteRole,
    switchWorkspace,
    fetchWorkspaces,
  };
}

export default useWorkspace;
