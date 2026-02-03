import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Task, Profile, Tables } from '../../types/supabase';
import { useAuth } from './useAuth';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

type TaskAssignee = Tables<'task_assignees'> & {
  profile: Profile;
};

type TaskWithAssignees = Task & {
  assignees: TaskAssignee[];
};

interface UseTasksReturn {
  tasks: TaskWithAssignees[];
  loading: boolean;
  error: Error | null;
  getTask: (taskId: string) => TaskWithAssignees | undefined;
  getTasksByStatus: (status: string) => TaskWithAssignees[];
  createTask: (
    boardId: string,
    title: string,
    status: string,
    data?: Partial<Task>
  ) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: string, newPosition?: number) => Promise<void>;
  assignTask: (taskId: string, userId: string) => Promise<void>;
  unassignTask: (taskId: string, userId: string) => Promise<void>;
  updateChecklist: (taskId: string, checklist: ChecklistItem[]) => Promise<void>;
  reorderTasks: (tasks: { id: string; position: number }[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTasks(boardId?: string): UseTasksReturn {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!boardId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            *,
            profile:profiles(*)
          )
        `)
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);

      setTasks(data as TaskWithAssignees[]);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [boardId]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to task changes with realtime
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`tasks:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchTasks(); // Refetch to get assignees
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev =>
              prev.map(t =>
                t.id === payload.new.id ? { ...t, ...payload.new } : t
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
        },
        () => {
          fetchTasks(); // Refetch when assignees change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, fetchTasks]);

  const getTask = useCallback((taskId: string) => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  const getTasksByStatus = useCallback((status: string) => {
    return tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);
  }, [tasks]);

  const createTask = useCallback(async (
    boardId: string,
    title: string,
    status: string,
    data?: Partial<Task>
  ) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    // Get max position for this status
    const tasksInStatus = tasks.filter(t => t.status === status);
    const maxPosition = tasksInStatus.length > 0
      ? Math.max(...tasksInStatus.map(t => t.position))
      : -1;

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        board_id: boardId,
        title,
        status,
        position: maxPosition + 1,
        created_by: user.id,
        ...data,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    setLoading(false);
    return newTask;
  }, [user, tasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setLoading(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
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

  const deleteTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    }

    setLoading(false);
  }, []);

  const moveTask = useCallback(async (
    taskId: string,
    newStatus: string,
    newPosition?: number
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate new position if not provided
    let position = newPosition;
    if (position === undefined) {
      const tasksInNewStatus = tasks.filter(t => t.status === newStatus && t.id !== taskId);
      position = tasksInNewStatus.length;
    }

    await updateTask(taskId, { status: newStatus, position });
  }, [tasks, updateTask]);

  const assignTask = useCallback(async (taskId: string, userId: string) => {
    setLoading(true);
    setError(null);

    const { error: assignError } = await supabase
      .from('task_assignees')
      .insert({
        task_id: taskId,
        user_id: userId,
      });

    if (assignError) {
      setError(new Error(assignError.message));
    }

    setLoading(false);
  }, []);

  const unassignTask = useCallback(async (taskId: string, userId: string) => {
    setLoading(true);
    setError(null);

    const { error: unassignError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (unassignError) {
      setError(new Error(unassignError.message));
    }

    setLoading(false);
  }, []);

  const updateChecklist = useCallback(async (taskId: string, checklist: ChecklistItem[]) => {
    await updateTask(taskId, { checklist });
  }, [updateTask]);

  const reorderTasks = useCallback(async (taskUpdates: { id: string; position: number }[]) => {
    setLoading(true);
    setError(null);

    try {
      // Batch update positions
      await Promise.all(
        taskUpdates.map(({ id, position }) =>
          supabase
            .from('tasks')
            .update({ position })
            .eq('id', id)
        )
      );

      // Update local state
      setTasks(prev =>
        prev.map(t => {
          const update = taskUpdates.find(u => u.id === t.id);
          return update ? { ...t, position: update.position } : t;
        })
      );
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, []);

  return {
    tasks,
    loading,
    error,
    getTask,
    getTasksByStatus,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    assignTask,
    unassignTask,
    updateChecklist,
    reorderTasks,
    refetch: fetchTasks,
  };
}

export default useTasks;
