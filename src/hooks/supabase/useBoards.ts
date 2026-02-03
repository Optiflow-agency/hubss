import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Board, Profile, Tables } from '../../types/supabase';
import { useAuth } from './useAuth';
import { useUser } from './useUser';

interface BoardColumn {
  id: string;
  title: string;
  color?: string;
}

type BoardMember = Tables<'board_members'> & {
  profile: Profile;
};

type BoardWithMembers = Board & {
  members: BoardMember[];
};

interface UseBoardsReturn {
  boards: BoardWithMembers[];
  loading: boolean;
  error: Error | null;
  getBoard: (boardId: string) => BoardWithMembers | undefined;
  createBoard: (
    title: string,
    description?: string,
    columns?: BoardColumn[],
    clientId?: string
  ) => Promise<Board | null>;
  updateBoard: (boardId: string, updates: Partial<Board>) => Promise<Board | null>;
  deleteBoard: (boardId: string) => Promise<void>;
  addBoardMember: (boardId: string, userId: string, canEdit?: boolean) => Promise<void>;
  removeBoardMember: (boardId: string, userId: string) => Promise<void>;
  updateBoardColumns: (boardId: string, columns: BoardColumn[]) => Promise<void>;
  refetch: () => Promise<void>;
}

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 'todo', title: 'Da Fare', color: '#6B7280' },
  { id: 'in-progress', title: 'In Corso', color: '#3B82F6' },
  { id: 'review', title: 'In Revisione', color: '#F59E0B' },
  { id: 'done', title: 'Completato', color: '#10B981' },
];

export function useBoards(): UseBoardsReturn {
  const { user } = useAuth();
  const { profile } = useUser();
  const [boards, setBoards] = useState<BoardWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBoards = useCallback(async () => {
    if (!profile?.workspace_id) {
      setBoards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('boards')
        .select(`
          *,
          members:board_members(
            *,
            profile:profiles(*)
          )
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      setBoards(data as BoardWithMembers[]);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [profile?.workspace_id]);

  // Initial fetch
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Subscribe to board changes
  useEffect(() => {
    if (!profile?.workspace_id) return;

    const channel = supabase
      .channel('boards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
          filter: `workspace_id=eq.${profile.workspace_id}`,
        },
        () => {
          fetchBoards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.workspace_id, fetchBoards]);

  const getBoard = useCallback((boardId: string) => {
    return boards.find(b => b.id === boardId);
  }, [boards]);

  const createBoard = useCallback(async (
    title: string,
    description?: string,
    columns?: BoardColumn[],
    clientId?: string
  ) => {
    if (!user || !profile?.workspace_id) return null;

    setLoading(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from('boards')
      .insert({
        workspace_id: profile.workspace_id,
        title,
        description,
        columns: columns ?? DEFAULT_COLUMNS,
        client_id: clientId,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    // Board creator is automatically added as member via trigger
    await fetchBoards();
    setLoading(false);
    return data;
  }, [user, profile?.workspace_id, fetchBoards]);

  const updateBoard = useCallback(async (boardId: string, updates: Partial<Board>) => {
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single();

    if (updateError) {
      setError(new Error(updateError.message));
      setLoading(false);
      return null;
    }

    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...data } : b));
    setLoading(false);
    return data;
  }, []);

  const deleteBoard = useCallback(async (boardId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      setBoards(prev => prev.filter(b => b.id !== boardId));
    }

    setLoading(false);
  }, []);

  const addBoardMember = useCallback(async (
    boardId: string,
    userId: string,
    canEdit = true
  ) => {
    setLoading(true);
    setError(null);

    const { error: addError } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: userId,
        can_edit: canEdit,
      });

    if (addError) {
      setError(new Error(addError.message));
    } else {
      await fetchBoards();
    }

    setLoading(false);
  }, [fetchBoards]);

  const removeBoardMember = useCallback(async (boardId: string, userId: string) => {
    setLoading(true);
    setError(null);

    const { error: removeError } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId);

    if (removeError) {
      setError(new Error(removeError.message));
    } else {
      await fetchBoards();
    }

    setLoading(false);
  }, [fetchBoards]);

  const updateBoardColumns = useCallback(async (boardId: string, columns: BoardColumn[]) => {
    await updateBoard(boardId, { columns });
  }, [updateBoard]);

  return {
    boards,
    loading,
    error,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    addBoardMember,
    removeBoardMember,
    updateBoardColumns,
    refetch: fetchBoards,
  };
}

export default useBoards;
