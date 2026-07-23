'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExplorerItem } from './FilePreviewExplorer';
import { parentDir } from './file-preview-fs';
import {
  canonicalDirKey,
  getDirectoriesToReveal,
  listDirectory,
  resolveExplorerRoot,
} from './file-preview-explorer.utils';

export function useExplorerTree(
  activePath: string | undefined,
  enabled: boolean,
  targetIsDirectory = false,
) {
  const [treeRoot, setTreeRoot] = useState('');
  const [childrenByDir, setChildrenByDir] = useState<Record<string, ExplorerItem[]>>({});
  const childrenByDirRef = useRef(childrenByDir);
  childrenByDirRef.current = childrenByDir;
  const [loadedDirs, setLoadedDirs] = useState<Set<string>>(() => new Set());
  const loadedDirsRef = useRef(loadedDirs);
  loadedDirsRef.current = loadedDirs;
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set());
  const expandedDirsRef = useRef(expandedDirs);
  expandedDirsRef.current = expandedDirs;
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(() => new Set());
  const pathByKeyRef = useRef<Record<string, string>>({});
  const lastRevealedPathRef = useRef<string | null>(null);
  const lastTargetIsDirectoryRef = useRef(false);
  const wasEnabledRef = useRef(false);

  const rememberPath = useCallback((dirPath: string) => {
    const key = canonicalDirKey(dirPath);
    if (!pathByKeyRef.current[key]) {
      pathByKeyRef.current[key] = dirPath;
    }
    return key;
  }, []);

  const resolveDirPath = useCallback((dirPathOrKey: string) => {
    const key = canonicalDirKey(dirPathOrKey);
    return pathByKeyRef.current[key] ?? dirPathOrKey;
  }, []);

  const loadDirectory = useCallback(async (dirPath: string, force = false) => {
    if (!dirPath) return;
    const key = rememberPath(dirPath);
    if (!force && loadedDirsRef.current.has(key)) return;

    setLoadingDirs((prev) => new Set(prev).add(key));
    try {
      const items = await listDirectory(dirPath);
      if (items === null) return;
      setChildrenByDir((prev) => ({ ...prev, [key]: items }));
      setLoadedDirs((prev) => new Set(prev).add(key));
    } finally {
      setLoadingDirs((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [rememberPath]);

  const revealPath = useCallback(async (targetPath: string) => {
    if (!targetPath) return;

    const root = resolveExplorerRoot(targetPath, targetIsDirectory);
    const dirsToReveal = getDirectoriesToReveal(targetPath, root, targetIsDirectory);

    setTreeRoot(root);
    setExpandedDirs(new Set(dirsToReveal.map((dir) => rememberPath(dir))));

    await Promise.all(dirsToReveal.map((dir) => loadDirectory(dir, true)));
    lastRevealedPathRef.current = targetPath;
    lastTargetIsDirectoryRef.current = targetIsDirectory;
  }, [loadDirectory, rememberPath, targetIsDirectory]);

  useEffect(() => {
    if (!enabled || !activePath) {
      wasEnabledRef.current = false;
      return;
    }

    const becomingEnabled = !wasEnabledRef.current;
    wasEnabledRef.current = true;

    if (becomingEnabled || activePath !== lastRevealedPathRef.current || targetIsDirectory !== lastTargetIsDirectoryRef.current) {
      void revealPath(activePath);
    }
  }, [activePath, enabled, revealPath, targetIsDirectory]);

  const toggleExpanded = useCallback(async (dirPath: string) => {
    const key = rememberPath(dirPath);
    const wasExpanded = expandedDirsRef.current.has(key);

    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (wasExpanded) next.delete(key);
      else next.add(key);
      return next;
    });

    if (!wasExpanded) {
      await loadDirectory(dirPath);
    }
  }, [loadDirectory, rememberPath]);

  const refreshDirectory = useCallback(async (dirPath: string) => {
    await loadDirectory(dirPath, true);
  }, [loadDirectory]);

  const refreshTree = useCallback(async () => {
    const dirs = Array.from(expandedDirsRef.current);
    await Promise.all(dirs.map((key) => loadDirectory(resolveDirPath(key), true)));
  }, [loadDirectory, resolveDirPath]);

  const invalidateDirectory = useCallback((dirPath: string) => {
    const key = canonicalDirKey(dirPath);
    setChildrenByDir((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLoadedDirs((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const resetTree = useCallback(() => {
    setTreeRoot('');
    setChildrenByDir({});
    setLoadedDirs(new Set());
    setExpandedDirs(new Set());
    setLoadingDirs(new Set());
    pathByKeyRef.current = {};
    lastRevealedPathRef.current = null;
    lastTargetIsDirectoryRef.current = false;
    wasEnabledRef.current = false;
  }, []);

  const isExpanded = useCallback(
    (dirPath: string) => expandedDirs.has(canonicalDirKey(dirPath)),
    [expandedDirs],
  );
  const isLoading = useCallback(
    (dirPath: string) => loadingDirs.has(canonicalDirKey(dirPath)),
    [loadingDirs],
  );

  const getChildren = useCallback(
    (dirPath: string) => childrenByDir[canonicalDirKey(dirPath)] ?? [],
    [childrenByDir],
  );

  const getCreateTargetDir = useCallback(
    (selectedPath: string | null, selectedIsDir: boolean) => {
      if (!selectedPath) return treeRoot;
      if (selectedIsDir) return selectedPath;
      return parentDir(selectedPath) || treeRoot;
    },
    [treeRoot],
  );

  return {
    treeRoot,
    revealPath,
    toggleExpanded,
    refreshTree,
    refreshDirectory,
    invalidateDirectory,
    resetTree,
    isExpanded,
    isLoading,
    getChildren,
    getCreateTargetDir,
  };
}
