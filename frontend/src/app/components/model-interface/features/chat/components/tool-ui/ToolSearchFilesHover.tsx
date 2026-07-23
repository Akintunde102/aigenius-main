'use client';

import React, { useMemo, useState } from 'react';
import { FiFile } from 'react-icons/fi';
import {
  buildSearchToolHoverPreview,
  formatSearchToolLineLabel,
  isSearchToolWithFileHover,
} from './search-tool-hover.utils';
import styles from './ToolSearchFilesHover.module.scss';

type ToolSearchFilesHoverProps = {
  tool: string;
  arguments?: Record<string, unknown>;
  result?: string;
  children: React.ReactNode;
};

export function ToolSearchFilesHover({
  tool,
  arguments: toolArgs,
  result,
  children,
}: ToolSearchFilesHoverProps) {
  const [open, setOpen] = useState(false);

  const preview = useMemo(
    () => (isSearchToolWithFileHover(tool) ? buildSearchToolHoverPreview(tool, toolArgs, result) : null),
    [tool, toolArgs, result],
  );

  if (!preview) {
    return <>{children}</>;
  }

  return (
    <span
      className={styles.wrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <div className={styles.popover} role="tooltip">
          <div className={styles.header}>
            <span>Searched files</span>
            <span className={styles.scope}>{preview.scopeLabel}</span>
          </div>
          {preview.files.length > 0 ? (
            <ul className={styles.list}>
              {preview.files.map((file) => {
                const lineLabel = formatSearchToolLineLabel(file);
                return (
                  <li key={`${file.path}:${file.line ?? ''}`} className={styles.item}>
                    <FiFile className={styles.fileIcon} size={12} aria-hidden />
                    <span className={styles.name} title={file.name}>
                      {file.name}
                    </span>
                    <span className={styles.path} title={file.path}>
                      {file.path}
                    </span>
                    {lineLabel ? <span className={styles.line}>{lineLabel}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.empty}>No file matches yet.</div>
          )}
        </div>
      ) : null}
    </span>
  );
}
