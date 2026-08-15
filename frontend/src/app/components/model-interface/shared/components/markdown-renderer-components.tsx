'use client';

import React from 'react';
import clsx from 'clsx';

import { buildLocalFilePreviewPayload } from '@/lib/utils/local-file-link';
import { isWorkflowShellPath, openWorkflow } from '@/lib/utils/open-workflow';
import { openFilePreview } from '@/app/components/modals/FilePreviewManager';
import {
    isMarkdownBlockCode,
    PreWithCopy,
} from './markdown-code-widgets';
import { MermaidRenderer } from './MermaidRenderer';
import { LocalFileInlineImage } from './LocalFileInlineImage';

type MarkdownCodeElementProps = React.HTMLAttributes<HTMLElement> & {
    node?: unknown;
    inline?: boolean;
};

function pageOrigin(): string | undefined {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
}

export function MarkdownAnchor({
    node,
    ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
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
                    openFilePreview(buildLocalFilePreviewPayload(decodedPath));
                }}
                title={`Preview file: ${filePath}`}
                className={clsx(props.className, 'local-file-link')}
            >
                {props.children}
            </a>
        );
    }

    const origin = pageOrigin();
    const isExternal = href && (href.startsWith('http://') || href.startsWith('https://')) &&
        (!origin || !href.startsWith(origin));
    const openBesideChat = href ? isWorkflowShellPath(href, origin) : false;
    const newTab = isExternal || openBesideChat;
    return (
        <a
            {...props}
            {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={
                openBesideChat
                    ? (e) => {
                          if (e.defaultPrevented) {
                              return;
                          }
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                              return;
                          }
                          e.preventDefault();
                          openWorkflow(href ?? '');
                      }
                    : props.onClick
            }
        />
    );
}

export function MarkdownImage({
    node,
    src,
    alt,
    ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) {
    void node;
    const imageSrc = typeof src === 'string' ? src : undefined;
    if (imageSrc?.startsWith('local-file://')) {
        const filePath = decodeURIComponent(imageSrc.slice('local-file://'.length));
        return <LocalFileInlineImage path={filePath} alt={alt} />;
    }
    // eslint-disable-next-line @next/next/no-img-element -- remote markdown images use standard img tags.
    return <img src={imageSrc} alt={alt} {...props} />;
}

export function MarkdownPre({
    node,
    children,
    ...props
}: React.HTMLAttributes<HTMLPreElement> & { node?: unknown }) {
    void node;
    const childrenArray = React.Children.toArray(children);
    const firstChild = childrenArray[0] as React.ReactElement;
    const firstChildClassName = (firstChild?.props?.className as string) || '';
    if (firstChildClassName.includes('language-mermaid')) {
        return <>{children}</>;
    }
    return <PreWithCopy {...props}>{children}</PreWithCopy>;
}

export function MarkdownCode({
    node,
    inline,
    className,
    children,
    ...props
}: MarkdownCodeElementProps) {
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
}

export const markdownRendererComponents = {
    a: MarkdownAnchor,
    img: MarkdownImage,
    pre: MarkdownPre,
    code: MarkdownCode,
};

export function markdownUrlTransform(url: string): string {
    if (url.startsWith('local-file://')) return url;
    return url;
}
