import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { TimeLog } from '../../types/supabase';
import { useAuth } from './useAuth';

interface UseTimeLogsReturn {
  timeLogs: TimeLog[];
  runningLog: TimeLog | null;
  loading: boolean;
  error: Error | null;
  startTimer: (taskId: string) => Promise<TimeLog | null>;
  stopTimer: () => Promise<TimeLog | null>;
  addManualEntry: (taskId: string, duration: number, description?: string) => Promise<TimeLog | null>;
  updateTimeLog: (logId: string, updates: Partial<TimeLog>) => Promise<void>;
  deleteTimeLog: (logId: string) => Promise<void>;
  getTaskTotalTime: (taskId: string) => number;
  getUserTotalTime: (startDate?: Date, endDate?: Date) => number;
  refetch: () => Promise<void>;
}

export function useTimeLogs(taskId?: string): UseTimeLogsReturn {
  const { user } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [runningLog, setRunningLog] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTimeLogs = useCallback(async () => {
    if (!user) {
      setTimeLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      // If taskId provided, filter by task
      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw new Error(fetchError.message);

      setTimeLogs(data);

      // Check for running timer
      const running = data.find(log => log.end_time === null);
      setRunningLog(running ?? null);
    } catch (err) {
      setError(err as Error);
    }

    setLoading(false);
  }, [user, taskId]);

  // Initial fetch
  useEffect(() => {
    fetchTimeLogs();
  }, [fetchTimeLogs]);

  // Check for running logs on mount (across all tasks)
  useEffect(() => {
    if (!user) return;

    const checkRunningLog = async () => {
      const { data } = await supabase
        .rpc('get_running_time_log');

      if (data && data.length > 0) {
        setRunningLog(data[0]);
      }
    };

    checkRunningLog();
  }, [user]);

  // Clean up timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startTimer = useCallback(async (taskId: string) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      // Stop any running timers first
      if (runningLog) {
        await supabase.rpc('stop_running_time_logs');
      }

      // Start new timer
      const { data, error: createError } = await supabase
        .from('time_logs')
        .insert({
          task_id: taskId,
          user_id: user.id,
          start_time: new Date().toISOString(),
          is_manual: false,
        })
        .select()
        .single();

      if (createError) throw new Error(createError.message);

      setRunningLog(data);
      await fetchTimeLogs();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [user, runningLog, fetchTimeLogs]);

  const stopTimer = useCallback(async () => {
    if (!runningLog) return null;

    setLoading(true);
    setError(null);

    try {
      const endTime = new Date();
      const duration = endTime.getTime() - new Date(runningLog.start_time).getTime();

      const { data, error: updateError } = await supabase
        .from('time_logs')
        .update({
          end_time: endTime.toISOString(),
          duration,
        })
        .eq('id', runningLog.id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      setRunningLog(null);
      await fetchTimeLogs();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [runningLog, fetchTimeLogs]);

  const addManualEntry = useCallback(async (
    taskId: string,
    duration: number,
    description?: string
  ) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - duration);

    const { data, error: createError } = await supabase
      .from('time_logs')
      .insert({
        task_id: taskId,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration,
        description,
        is_manual: true,
      })
      .select()
      .single();

    if (createError) {
      setError(new Error(createError.message));
      setLoading(false);
      return null;
    }

    await fetchTimeLogs();
    setLoading(false);
    return data;
  }, [user, fetchTimeLogs]);

  const updateTimeLog = useCallback(async (logId: string, updates: Partial<TimeLog>) => {
    setLoading(true);
    setError(null);

    // Recalculate duration if times changed
    if (updates.start_time || updates.end_time) {
      const log = timeLogs.find(l => l.id === logId);
      if (log) {
        const startTime = new Date(updates.start_time ?? log.start_time);
        const endTime = updates.end_time ? new Date(updates.end_time) : (log.end_time ? new Date(log.end_time) : null);

        if (endTime) {
          updates.duration = endTime.getTime() - startTime.getTime();
        }
      }
    }

    const { error: updateError } = await supabase
      .from('time_logs')
      .update(updates)
      .eq('id', logId);

    if (updateError) {
      setError(new Error(updateError.message));
    } else {
      await fetchTimeLogs();
    }

    setLoading(false);
  }, [timeLogs, fetchTimeLogs]);

  const deleteTimeLog = useCallback(async (logId: string) => {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('time_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) {
      setError(new Error(deleteError.message));
    } else {
      if (runningLog?.id === logId) {
        setRunningLog(null);
      }
      setTimeLogs(prev => prev.filter(l => l.id !== logId));
    }

    setLoading(false);
  }, [runningLog]);

  const getTaskTotalTime = useCallback((taskId: string) => {
    return timeLogs
      .filter(log => log.task_id === taskId && log.duration > 0)
      .reduce((total, log) => total + log.duration, 0);
  }, [timeLogs]);

  const getUserTotalTime = useCallback((startDate?: Date, endDate?: Date) => {
    let logs = timeLogs.filter(log => log.duration > 0);

    if (startDate) {
      logs = logs.filter(log => new Date(log.start_time) >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => new Date(log.start_time) <= endDate);
    }

    return logs.reduce((total, log) => total + log.duration, 0);
  }, [timeLogs]);

  return {
    timeLogs,
    runningLog,
    loading,
    error,
    startTimer,
    stopTimer,
    addManualEntry,
    updateTimeLog,
    deleteTimeLog,
    getTaskTotalTime,
    getUserTotalTime,
    refetch: fetchTimeLogs,
  };
}

// Utility function to format time
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default useTimeLogs;
