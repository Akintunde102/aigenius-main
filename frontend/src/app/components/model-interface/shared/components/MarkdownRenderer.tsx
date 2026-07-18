'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import clsx from 'clsx';

import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import './markdown-renderer.scss';

import {
    isMarkdownBlockCode,
    PreWithCopy,
} from './markdown-code-widgets';
import { MermaidRenderer } from './MermaidRenderer';
import { buildLocalFilePreviewPayload } from '@/lib/utils/local-file-link';
import { openFilePreview } from '@/app/components/modals/FilePreviewManager';

type MarkdownCodeElementProps = React.HTMLAttributes<HTMLElement> & {
    node?: unknown;
    inline?: boolean;
};

export interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Workflow studio lives at `/workflow/:id`. Opening those links in a new tab keeps the chat conversation in place.
 */
export function shouldOpenWorkflowStudioLinkInNewTab(href: string, pageOrigin?: string): boolean {
    const t = href.trim();
    if (!t) {
        return false;
    }
    if (t.startsWith('/workflow/')) {
        const rest = t.slice('/workflow/'.length);
        const first = rest.split('/')[0] ?? '';
        return first.length > 0;
    }
    if (!pageOrigin) {
        return false;
    }
    try {
        const u = new URL(t);
        if (u.origin !== pageOrigin) {
            return false;
        }
        const parts = u.pathname.split('/').filter(Boolean);
        return parts[0] === 'workflow' && (parts[1]?.length ?? 0) > 0;
    } catch {
        return false;
    }
}

/** Renders LLM message text as GFM Markdown with fenced-code syntax highlighting. */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    const trimmed = content.trim();
    if (!trimmed) {
        return null;
    }

    const pageOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

    const processedContent = React.useMemo(() => {
        return content;
    }, [content]);

    return (
        <div
            className={clsx(
                'markdown-body markdown-chat-body min-w-0 max-w-full break-words',
                className,
            )}
        >
            <ReactMarkdown
                urlTransform={(url) => {
                    // Explicitly allow our custom protocol; react-markdown v9 strips unknown protocols by default.
                    if (url.startsWith('local-file://')) return url;
                    // Let react-markdown apply its own default sanitisation for everything else.
                    return url;
                }}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    a: ({ node, ...props }) => {
                        void node;
                        const href = typeof props.href === 'string' ? props.href : undefined;

                        if (href?.startsWith('local-file://')) {
                            const filePath = href.slice('local-file://'.length);
                            return (
                                <a
                                    {...props}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const decodedPath = decodeURIComponent(filePath);
                                        openFilePreview(
                                            buildLocalFilePreviewPayload(decodedPath, { placement: 'side' }),
                                        );
                                    }}
                                    title={`Preview file: ${filePath}`}
                                    className={clsx(props.className, 'local-file-link')}
                                >
                                    {props.children}
                                </a>
                            );
                        }

                        const isExternal = href && (href.startsWith('http://') || href.startsWith('https://')) &&
                            (!pageOrigin || !href.startsWith(pageOrigin));
                        const newTab = isExternal || shouldOpenWorkflowStudioLinkInNewTab(href ?? '', pageOrigin);
                        return (
                            <a
                                {...props}
                                {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            />
                        );
                    },
                    pre: ({ node, children, ...props }) => {
                        void node;
                        // If the child is the code block and it's mermaid, we skip the PreWithCopy wrapper
                        // because MermaidRenderer handles its own container and styling.
                        const childrenArray = React.Children.toArray(children);
                        const firstChild = childrenArray[0] as React.ReactElement;
                        const firstChildClassName = (firstChild?.props?.className as string) || '';
                        if (firstChildClassName.includes('language-mermaid')) {
                            return <>{children}</>;
                        }
                        return <PreWithCopy {...props}>{children}</PreWithCopy>;
                    },
                    code: ({ node, inline, className, children, ...props }: MarkdownCodeElementProps) => {
                        void node;
                        const isMermaid = className?.includes('language-mermaid');

                        if (isMarkdownBlockCode(className, inline)) {
                            if (isMermaid) {
                                return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
                            }
                            return (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code className={clsx('markdown-inline-code', className)} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
