'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Pluggable } from 'unified';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import clsx from 'clsx';

import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import './markdown-renderer.scss';

import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { linkifyMarkdownFilePaths } from '@/lib/utils/linkifyMarkdownFilePaths';
import { repairLlmMarkdown } from '@/lib/utils/repairLlmMarkdown';
import {
    markdownRendererComponents,
    markdownUrlTransform,
    shouldOpenWorkflowStudioLinkInNewTab,
} from './markdown-renderer-components';

export { shouldOpenWorkflowStudioLinkInNewTab };

/** Allow `<br>` in LLM table cells and `local-file://` preview links. */
export const markdownSanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), 'br'],
    protocols: {
        ...defaultSchema.protocols,
        href: [...(defaultSchema.protocols?.href ?? []), 'local-file'],
        src: [...(defaultSchema.protocols?.src ?? []), 'local-file'],
    },
};

export interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeHighlight];

/** Renders LLM message text as GFM Markdown with fenced-code syntax highlighting. */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    const trimmed = content.trim();
    if (!trimmed) {
        return null;
    }

    const processedContent = useMemo(() => {
        let text = repairLlmMarkdown(content);
        if (isAigeniusDesktopRuntime()) {
            text = linkifyMarkdownFilePaths(text);
        }
        return text;
    }, [content]);

    return (
        <div
            className={clsx(
                'markdown-body markdown-chat-body min-w-0 max-w-full break-words',
                className,
            )}
        >
            <ReactMarkdown
                urlTransform={markdownUrlTransform}
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS as Pluggable[]}
                components={markdownRendererComponents}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
