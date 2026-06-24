"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudFile } from "@/app/components/file/file.interface";
import { fetchUploadedFilesList } from "./uploaded-files-list.api";

export interface UploadedFilesLibraryState {
  files: CloudFile[];
  loading: boolean;
  isRefreshing: boolean;
  fetchError: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}

export function useUploadedFilesList(options?: {
  /** When true, this hook does not fetch; caller supplies `library` to UserFilesBrowser instead. */
  skip?: boolean;
}): UploadedFilesLibraryState {
  const skip = options?.skip === true;
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(!skip);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const previousFiles = filesRef.current;
    const hasData = previousFiles.length > 0;
    if (silent && hasData) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(null);
    const { ok, files: next } = await fetchUploadedFilesList();
    if (!ok) {
      setFetchError("Could not load your files.");
      if (!hasData) {
        setFiles([]);
      }
    } else {
      setFiles(next);
    }
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (skip) return;
    void refresh();
  }, [skip, refresh]);

  return { files, loading, isRefreshing, fetchError, refresh };
}
