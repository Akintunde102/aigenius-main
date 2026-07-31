'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiExternalLink, FiLoader } from 'react-icons/fi';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { getToolDisplayName } from '../toolDisplayNames';
import { toolStreamingInlineStatus } from '../tool-streaming-inline-status';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import {
  faviconUrlForHost,
  formatWebFetchBytes,
  formatWebFetchDuration,
  hostnameFromUrl,
  parseWebFetchResult,
  webFetchContentToRender,
  webFetchDisplayUrl,
  webFetchLinks,
  webFetchLoadingLabel,
  webFetchLoadingPhase,
  webFetchWarningLabel,
} from './web-fetch-display.utils';
import styles from './ToolWebFetchCard.module.scss';

export function ToolWebFetchCard({
  streaming_tool,
  result,
  arguments: toolArgsProp,
  groupItem = false,
}: ToolStreamingCardProps) {
  const { displayName, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [containerCollapsed, setContainerCollapsed] = useState(groupItem);
  const [contentOpen, setContentOpen] = useState(false);
  const wasLoadingRef = useRef(loading);

  const parsed = useMemo(() => parseWebFetchResult(result), [result]);
  const displayUrl = useMemo(() => webFetchDisplayUrl(toolArgs, parsed), [toolArgs, parsed]);
  const host = useMemo(() => (displayUrl ? hostnameFromUrl(displayUrl) : ''), [displayUrl]);
  const phase = webFetchLoadingPhase(loading, parsed !== null);
  const contentToRender = useMemo(() => webFetchContentToRender(parsed), [parsed]);
  const links = useMemo(() => webFetchLinks(parsed), [parsed]);

  const activityTitle = toolArgs?.activityTitle as string | undefined;
  const resolvedDisplayName = activityTitle || displayName || getToolDisplayName('web_fetch');
  const statusText = toolStreamingInlineStatus(loading, success);
  const loadingLabel = webFetchLoadingLabel(toolArgs, phase);

  useEffect(() => {
    if (!groupItem) return;
    if (loading) {
      setContainerCollapsed(false);
    }
  }, [groupItem, loading]);

  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      if (success === false) {
        setContainerCollapsed(false);
        setContentOpen(false);
      } else if (success === true) {
        setContentOpen(false);
        if (groupItem) {
          setContainerCollapsed(true);
        }
      }
    }
    wasLoadingRef.current = loading;
  }, [groupItem, loading, success]);

  const titleText = loading
    ? loadingLabel
    : parsed?.title?.trim() || (host ? `Fetched ${host}` : resolvedDisplayName);

  const durationLabel = formatWebFetchDuration(parsed?.durationMs);
  const sizeLabel = formatWebFetchBytes(parsed?.bytes);
  const warnings = Array.isArray(parsed?.warnings) ? parsed!.warnings! : [];

  return (
    <div className={`${styles.root} ${groupItem ? '' : 'my-1 w-full'}`}>
      <button
        type="button"
        onClick={() => setContainerCollapsed(!containerCollapsed)}
        className={styles.toggle}
        aria-expanded={!containerCollapsed}
      >
        <span className={styles.titleRow}>
          {host ? (
            <img
              src={faviconUrlForHost(host)}
              alt=""
              width={14}
              height={14}
              className={styles.favicon}
              loading="lazy"
            />
          ) : null}
          <span className={`${styles.title} ${loading ? styles.titleLoading : ''}`}>{titleText}</span>
        </span>
        {!groupItem ? <span className={styles.status}>· {statusText}</span> : null}
        {loading ? <FiLoader className="h-3 w-3 animate-spin shrink-0" aria-hidden /> : null}
        <span className={styles.chevron} aria-hidden>
          {containerCollapsed ? '▸' : '▾'}
        </span>
      </button>

      {!containerCollapsed && (
        <div className={styles.details}>
          {success === false && parsed?.error ? (
            <div className={styles.errorPanel}>{parsed.error}</div>
          ) : null}

          {parsed?.success !== false && (parsed || loading) ? (
            <div className={styles.previewCard}>
              {parsed?.title ? (
                <div className={styles.pageTitle}>
                  {displayUrl ? (
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pageLink}
                    >
                      {parsed.title}
                      <FiExternalLink className="inline ml-1" size={11} aria-hidden />
                    </a>
                  ) : (
                    parsed.title
                  )}
                </div>
              ) : displayUrl ? (
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.pageTitle} ${styles.pageLink}`}
                >
                  {host || displayUrl}
                  <FiExternalLink className="inline ml-1" size={11} aria-hidden />
                </a>
              ) : null}

              {parsed?.description ? (
                <p className={styles.description}>{parsed.description}</p>
              ) : parsed?.preview && !contentOpen ? (
                <p className={styles.previewText}>{parsed.preview}</p>
              ) : null}

              <div className={styles.metaRow}>
                {durationLabel ? <span className={styles.badge}>{durationLabel}</span> : null}
                {sizeLabel ? <span className={styles.badge}>{sizeLabel}</span> : null}
                {parsed?.cacheHit ? <span className={`${styles.badge} ${styles.badgeCache}`}>cached</span> : null}
                {typeof parsed?.code === 'number' ? (
                  <span className={styles.badge}>HTTP {parsed.code}</span>
                ) : null}
                {warnings.map((w) => (
                  <span key={w} className={`${styles.badge} ${styles.badgeWarn}`}>
                    {webFetchWarningLabel(w)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {contentToRender ? (
            <>
              <button
                type="button"
                onClick={() => setContentOpen(!contentOpen)}
                className={styles.sectionToggle}
              >
                <span>Page content</span>
                {contentOpen ? <FiChevronUp size={12} aria-hidden /> : <FiChevronDown size={12} aria-hidden />}
              </button>
              {contentOpen ? (
                <div className={styles.contentPanel}>
                  <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                </div>
              ) : null}
            </>
          ) : null}

          {links.length > 0 ? (
            <ul className={styles.linksList}>
              {links.map((link) => (
                <li key={`${link.href}-${link.text}`} className={styles.linkItem}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
