'use client';

import React from 'react';
import { FiFile, FiFolder } from 'react-icons/fi';
import {
  fileExtensionLabel,
  formatFileSize,
  formatModifiedDate,
  type ParsedDirectoryListing,
  toLocalFileHref,
} from './list-directory-result.utils';
import styles from './DirectoryListingDisplay.module.scss';

type DirectoryListingDisplayProps = {
  listing: ParsedDirectoryListing;
};

function pathTail(dirPath: string): string {
  const normalized = dirPath.replace(/\\/g, '/').replace(/\/$/, '');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || dirPath;
}

export function DirectoryListingDisplay({ listing }: DirectoryListingDisplayProps) {
  const { directoryPath, items, hitLimit, terminalOutput } = listing;
  const countLabel = hitLimit
    ? `${items.length}+ entries`
    : items.length === 1
      ? '1 entry'
      : `${items.length} entries`;

  if (terminalOutput?.trim()) {
    return (
      <div className={styles.root}>
        {directoryPath ? (
          <div className={styles.header}>
            <span className={styles.path}>{directoryPath}</span>
          </div>
        ) : null}
        <pre className={styles.terminal}>{terminalOutput}</pre>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {directoryPath ? (
          <span className={styles.path}>
            <a href={toLocalFileHref(directoryPath)} className={styles.pathLink}>
              {pathTail(directoryPath)}
            </a>
          </span>
        ) : null}
        <span className={styles.badge}>{countLabel}</span>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>No entries matched (or directory is empty).</p>
      ) : (
        <ul className={styles.list} aria-label="Directory entries">
          {items.map((item) => (
            <li
              key={item.path}
              className={`${styles.row} ${item.isDir ? styles.rowDir : ''}`}
            >
              <span className={styles.icon} aria-hidden>
                {item.isDir ? <FiFolder size={14} /> : <FiFile size={14} />}
              </span>

              <div className={styles.main}>
                <span className={styles.name} title={item.name}>
                  <a href={toLocalFileHref(item.path)} className={styles.nameLink}>
                    {item.name}
                  </a>
                </span>

                {!item.isDir ? (
                  <span className={styles.meta}>
                    <span>{fileExtensionLabel(item.name)}</span>
                    {typeof item.mtimeMs === 'number' ? (
                      <>
                        <span className={styles.metaSep} aria-hidden />
                        <span>{formatModifiedDate(item.mtimeMs)}</span>
                      </>
                    ) : null}
                  </span>
                ) : (
                  <span className={styles.meta}>Folder</span>
                )}
              </div>

              {!item.isDir && typeof item.size === 'number' ? (
                <span className={styles.side}>{formatFileSize(item.size)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
