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
    InlineCodeWithCopy,
    isMarkdownBlockCode,
    PreWithCopy,
} from './markdown-code-widgets';
import { MermaidRenderer } from './MermaidRenderer';

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
                        console.log('[aigenius-debug] a-tag href:', href);

                        if (href?.startsWith('local-file://')) {
                            const filePath = href.slice('local-file://'.length);
                            console.log('[aigenius-desktop] local-file href detected:', href, '| filePath:', filePath);
                            return (
                                <a
                                    {...props}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const decodedPath = decodeURIComponent(filePath);
                                        console.log('[aigenius-desktop] Triggering file preview for:', decodedPath);
                                        const bridge = (window as any).aigeniusDesktop;

                                        const hasExtension = decodedPath.includes('.') && !decodedPath.endsWith('.') && !decodedPath.endsWith('/');
                                        const ext = hasExtension ? decodedPath.split('.').pop()?.toLowerCase() || '' : '';

                                        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
                                        const pdfExts = ['pdf'];
                                        const videoExts = ['mp4', 'webm', 'ogg'];
                                        const audioExts = ['mp3', 'wav', 'ogg'];

                                        let type = 'code';
                                        if (!hasExtension) {
                                            type = 'folder';
                                        } else if (imageExts.includes(ext)) {
                                            type = 'image';
                                        } else if (pdfExts.includes(ext)) {
                                            type = 'pdf';
                                        } else if (videoExts.includes(ext)) {
                                            type = 'video';
                                        } else if (audioExts.includes(ext)) {
                                            type = 'audio';
                                        }

                                        const triggerPreview = (textContent?: string) => {
                                            import('@/app/components/modals/FilePreviewManager').then(({ openFilePreview }) => {
                                                openFilePreview({
                                                    url: href,
                                                    name: decodedPath.split(/[/\\]/).pop() || decodedPath,
                                                    type: type as any,
                                                    localPath: decodedPath,
                                                    textContent
                                                });
                                            });
                                        };

                                        if (type === 'code') {
                                            triggerPreview('// Loading code...');
                                        } else {
                                            triggerPreview();
                                        }
                                    }}
                                    title={`Preview file: ${filePath}`}
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
                            <InlineCodeWithCopy className={className} {...props}>
                                {children}
                            </InlineCodeWithCopy>
                        );
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
