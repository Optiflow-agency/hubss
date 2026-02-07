import { useState, useCallback } from 'react';
import { uploadFile, getPublicUrl, getSignedUrl, deleteFile } from '../../lib/supabase';
import { useAuth } from './useAuth';
import { useUser } from './useUser';

type StorageBucket = 'avatars' | 'workspace-logos' | 'task-attachments' | 'client-files' | 'chat-attachments';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseStorageReturn {
  uploading: boolean;
  progress: UploadProgress | null;
  error: Error | null;
  uploadAvatar: (file: File) => Promise<string | null>;
  uploadWorkspaceLogo: (workspaceId: string, file: File) => Promise<string | null>;
  uploadTaskAttachment: (boardId: string, taskId: string, file: File) => Promise<{
    url: string;
    name: string;
    type: 'image' | 'file';
    size: number;
  } | null>;
  uploadChatAttachment: (channelId: string, file: File) => Promise<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>;
  uploadClientFile: (clientId: string, file: File) => Promise<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>;
  getUrl: (bucket: StorageBucket, path: string, signed?: boolean) => Promise<string>;
  deleteFiles: (bucket: StorageBucket, paths: string[]) => Promise<void>;
}

export function useStorage(): UseStorageReturn {
  const { user } = useAuth();
  const { profile } = useUser();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleUpload = useCallback(async (
    bucket: StorageBucket,
    path: string,
    file: File,
    options?: { upsert?: boolean }
  ): Promise<string | null> => {
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    setError(null);

    try {
      await uploadFile(bucket, path, file, options);

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      setUploading(false);

      // Return appropriate URL type based on bucket
      if (bucket === 'avatars' || bucket === 'workspace-logos') {
        return getPublicUrl(bucket, path);
      } else {
        return await getSignedUrl(bucket, path);
      }
    } catch (err) {
      setError(err as Error);
      setUploading(false);
      return null;
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const path = `${user.id}/avatar.${fileExt}`;

    return handleUpload('avatars', path, file, { upsert: true });
  }, [user, handleUpload]);

  const uploadWorkspaceLogo = useCallback(async (workspaceId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const path = `${workspaceId}/logo.${fileExt}`;

    return handleUpload('workspace-logos', path, file, { upsert: true });
  }, [handleUpload]);

  const uploadTaskAttachment = useCallback(async (
    boardId: string,
    taskId: string,
    file: File
  ) => {
    if (!profile?.workspace_id) return null;

    const timestamp = Date.now();
    const path = `${profile.workspace_id}/${boardId}/${taskId}/${timestamp}_${file.name}`;

    const url = await handleUpload('task-attachments', path, file);
    if (!url) return null;

    // Determine file type
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const type: 'image' | 'file' = imageTypes.includes(file.type) ? 'image' : 'file';

    return {
      url,
      name: file.name,
      type,
      size: file.size,
    };
  }, [profile?.workspace_id, handleUpload]);

  const uploadChatAttachment = useCallback(async (channelId: string, file: File) => {
    if (!profile?.workspace_id) return null;

    const timestamp = Date.now();
    const path = `${profile.workspace_id}/${channelId}/${timestamp}_${file.name}`;

    const url = await handleUpload('chat-attachments', path, file);
    if (!url) return null;

    return {
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }, [profile?.workspace_id, handleUpload]);

  const uploadClientFile = useCallback(async (clientId: string, file: File) => {
    if (!profile?.workspace_id) return null;

    const timestamp = Date.now();
    const path = `${profile.workspace_id}/${clientId}/${timestamp}_${file.name}`;

    const url = await handleUpload('client-files', path, file);
    if (!url) return null;

    return {
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }, [profile?.workspace_id, handleUpload]);

  const getUrl = useCallback(async (
    bucket: StorageBucket,
    path: string,
    signed = false
  ) => {
    if (bucket === 'avatars' || bucket === 'workspace-logos' || !signed) {
      return getPublicUrl(bucket, path);
    }
    return getSignedUrl(bucket, path);
  }, []);

  const deleteFiles = useCallback(async (bucket: StorageBucket, paths: string[]) => {
    setError(null);

    try {
      await deleteFile(bucket, paths);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadAvatar,
    uploadWorkspaceLogo,
    uploadTaskAttachment,
    uploadChatAttachment,
    uploadClientFile,
    getUrl,
    deleteFiles,
  };
}

// Utility hook for drag and drop file upload
export function useFileDropzone(
  onUpload: (files: File[]) => Promise<void>,
  options?: {
    accept?: string[];
    maxSize?: number;
    maxFiles?: number;
  }
) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);

    // Validate file count
    if (options?.maxFiles && files.length > options.maxFiles) {
      setError(`Puoi caricare massimo ${options.maxFiles} file alla volta`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      // Check type
      if (options?.accept && !options.accept.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      })) {
        setError(`Tipo di file non supportato: ${file.name}`);
        continue;
      }

      // Check size
      if (options?.maxSize && file.size > options.maxSize) {
        const maxMB = options.maxSize / (1024 * 1024);
        setError(`File troppo grande: ${file.name} (max ${maxMB}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      await onUpload(validFiles);
    }
  }, [onUpload, options]);

  return {
    isDragging,
    error,
    dropzoneProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

export default useStorage;
