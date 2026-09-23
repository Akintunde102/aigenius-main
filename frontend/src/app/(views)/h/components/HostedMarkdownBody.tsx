'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { Pluggable } from 'unified';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import clsx from 'clsx';

import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import '@/app/components/model-interface/shared/components/markdown-renderer.scss';
import './hosted-markdown-body.scss';

import { markdownSanitizeSchema } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { hostedHeadingId, listHostedMarkdownHeadings } from '../hostedFileSeo.utils';

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [
    rehypeRaw,
    [rehypeSanitize, markdownSanitizeSchema],
    [rehypeHighlight, { ignoreMissing: true, plainText: ['plaintext', 'text', 'txt', 'plain'] }],
] as Pluggable[];

function headingText(children: React.ReactNode): string {
    return React.Children.toArray(children)
        .map((child) => {
            if (typeof child === 'string' || typeof child === 'number') return String(child);
            if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
                return headingText(child.props.children);
            }
            return '';
        })
        .join('')
        .trim();
}

function isExternalHref(href: string | undefined): boolean {
    if (!href) return false;
    return /^https?:\/\//i.test(href);
}

export function HostedMarkdownBody({ markdown }: { markdown: string }) {
    const headingQueue = useMemo(
        () => listHostedMarkdownHeadings(markdown),
        [markdown],
    );

    const components = useMemo<Components>(() => {
        let headingIndex = 0;
        const idFor = (children: React.ReactNode): string => {
            const text = headingText(children);
            const match = headingQueue.find((heading) => heading.text === text);
            if (match) {
                const sequential = headingQueue[headingIndex];
                headingIndex += 1;
                return sequential?.id || match.id;
            }
            return hostedHeadingId(text);
        };

        const heading = (Tag: 'h1' | 'h2' | 'h3'): NonNullable<Components['h1']> =>
            ({ children, node: _node, ...props }) => {
                const id = idFor(children);
                return (
                    <Tag {...props} id={id} className="scroll-mt-14">
                        <a href={`#${id}`} className="hosted-heading-anchor">
                            {children}
                        </a>
                    </Tag>
                );
            };

        return {
            h1: heading('h1'),
            h2: heading('h2'),
            h3: heading('h3'),
            a: ({ href, children, node: _node, ...props }) => {
                const external = isExternalHref(href);
                return (
                    <a
                        {...props}
                        href={href}
                        target={external ? '_blank' : props.target}
                        rel={external ? 'noopener noreferrer ugc nofollow' : props.rel}
                    >
                        {children}
                    </a>
                );
            },
        };
    }, [headingQueue]);

    return (
        <div className={clsx('markdown-body markdown-chat-body hosted-markdown-body min-w-0 max-w-full break-words')}>
            <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={components}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    );
}
