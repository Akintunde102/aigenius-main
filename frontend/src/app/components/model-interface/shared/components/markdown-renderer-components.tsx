'use client';

import React from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

import { buildLocalFilePreviewPayload } from '@/lib/utils/local-file-link';
import { isWorkflowShellPath, openWorkflow } from '@/lib/utils/open-workflow';
import { normalizeChatConversationOpenPath } from '@/lib/utils/safe-internal-next-path';
import { openFilePreview } from '@/app/components/modals/FilePreviewManager';
import { openVideoTrackingModal } from '@/app/components/modals/VideoTrackingManager';
import {
    isMarkdownBlockCode,
    PreWithCopy,
} from './markdown-code-widgets';
import { MermaidRenderer } from './MermaidRenderer';
import { LocalFileInlineImage } from './LocalFileInlineImage';
import { MarkdownYoutubeEmbed } from './MarkdownYoutubeEmbed';
import { MarkdownVideoPlayer } from './MarkdownVideoPlayer';
import { LocalFileInlineMedia } from './LocalFileInlineMedia';
import {
    isYoutubeWatchUrl,
    shouldEmbedYoutubeMarkdownLink,
} from '@/lib/utils/youtube-embed.utils';
import {
    isEmbeddableMediaFileUrl,
    shouldEmbedMediaMarkdownLink,
} from '@/lib/utils/markdown-media-embed.utils';
import { inferLocalFilePreviewType, localFileLinkLabel } from '@/lib/utils/local-file-link';
import { MarkdownExternalLink } from './MarkdownExternalLink';
import { externalLinkPreview } from './markdown-external-link.utils';
import { useImagePreviewActions } from '@/app/components/model-interface/features/message-types/components/ImagePreviewActionsContext';

function reactNodeToPlainText(node: React.ReactNode): string {
    if (node == null || typeof node === 'boolean') {
        return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(reactNodeToPlainText).join('');
    }
    if (React.isValidElement(node)) {
        return reactNodeToPlainText(node.props.children);
    }
    return '';
}

type MarkdownCodeElementProps = React.HTMLAttributes<HTMLElement> & {
    node?: unknown;
    inline?: boolean;
};

function pageOrigin(): string | undefined {
    return typeof window !== 'undefined' ? window.location.origin : undefined;
}

const PREVIEW_MEDIA_LABEL_RE = /^(preview|watch(\s+video)?|video|play|▶|▶️)$/i;

function shouldEmbedLocalFileMedia(path: string, href: string, linkText: string): boolean {
    const type = inferLocalFilePreviewType(path);
    if (type !== 'video' && type !== 'audio') {
        return false;
    }
    const text = linkText.trim();
    const name = localFileLinkLabel(path);
    if (!text || PREVIEW_MEDIA_LABEL_RE.test(text)) {
        return true;
    }
    if (text === name || text === path || text === href) {
        return true;
    }
    return false;
}

export function MarkdownAnchor({
    node,
    ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
    void node;
    const router = useRouter();
    const href = typeof props.href === 'string' ? props.href : undefined;

    if (href && isYoutubeWatchUrl(href)) {
        const linkText = reactNodeToPlainText(props.children);
        if (shouldEmbedYoutubeMarkdownLink(href, linkText)) {
            return <MarkdownYoutubeEmbed watchUrl={href} title={linkText || undefined} />;
        }
    }

    if (href && isEmbeddableMediaFileUrl(href)) {
        const linkText = reactNodeToPlainText(props.children);
        if (shouldEmbedMediaMarkdownLink(href, linkText)) {
            return <MarkdownVideoPlayer src={href} title={linkText || undefined} />;
        }
    }

    if (href && (href.startsWith('/track/video/') || href.includes('/track/video/'))) {
        const linkText = reactNodeToPlainText(props.children);
        const slug = href.split('/track/video/')[1]?.split(/[?#]/)[0] || '';
        return (
            <a
                {...props}
                href={href}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openVideoTrackingModal({
                        identifier: slug,
                        title: linkText || undefined,
                    });
                }}
                className={clsx(
                    props.className,
                    'inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 transition shadow-sm'
                )}
            >
                {props.children}
            </a>
        );
    }

    if (href?.startsWith('local-file://')) {
        const filePath = href.slice('local-file://'.length);
        const decodedPath = decodeURIComponent(filePath);
        const localType = inferLocalFilePreviewType(decodedPath);
        const linkText = reactNodeToPlainText(props.children);
        if (
            (localType === 'video' || localType === 'audio') &&
            shouldEmbedLocalFileMedia(decodedPath, href, linkText)
        ) {
            return <LocalFileInlineMedia path={decodedPath} kind={localType} alt={linkText || undefined} />;
        }
        return (
            <a
                {...props}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
    const chatPath = href ? normalizeChatConversationOpenPath(href, origin) : null;
    if (chatPath) {
        return (
            <a
                {...props}
                href={chatPath}
                onClick={(e) => {
                    if (props.onClick) {
                        props.onClick(e);
                    }
                    if (e.defaultPrevented) {
                        return;
                    }
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                        return;
                    }
                    e.preventDefault();
                    router.push(chatPath);
                }}
            />
        );
    }

    const isExternal = href && (href.startsWith('http://') || href.startsWith('https://')) &&
        (!origin || !href.startsWith(origin));
    const openBesideChat = href ? isWorkflowShellPath(href, origin) : false;
    const externalPreview = href && isExternal && !openBesideChat ? externalLinkPreview(href) : null;
    if (externalPreview) {
        return (
            <MarkdownExternalLink
                href={externalPreview.url}
                host={externalPreview.host}
                className={props.className}
                onClick={props.onClick}
            >
                {props.children}
            </MarkdownExternalLink>
        );
    }
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
    className,
    ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) {
    void node;
    const previewActions = useImagePreviewActions();
    const imageSrc = typeof src === 'string' ? src : undefined;
    if (imageSrc && isYoutubeWatchUrl(imageSrc)) {
        return <MarkdownYoutubeEmbed watchUrl={imageSrc} title={typeof alt === 'string' ? alt : undefined} />;
    }
    if (imageSrc && isEmbeddableMediaFileUrl(imageSrc)) {
        return <MarkdownVideoPlayer src={imageSrc} title={typeof alt === 'string' ? alt : undefined} />;
    }
    if (imageSrc?.startsWith('local-file://')) {
        const filePath = decodeURIComponent(imageSrc.slice('local-file://'.length));
        const localType = inferLocalFilePreviewType(filePath);
        if (localType === 'video' || localType === 'audio') {
            return <LocalFileInlineMedia path={filePath} kind={localType} alt={alt} />;
        }
        return <LocalFileInlineImage path={filePath} alt={alt} />;
    }
    const openPreview = previewActions?.openImagePreview;
    const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
        props.onClick?.(event);
        if (event.defaultPrevented || !imageSrc || !openPreview) return;
        event.preventDefault();
        openPreview({
            fileUrl: imageSrc,
            fileName: typeof alt === 'string' && alt.trim() ? alt : 'Image',
            kind: 'image',
        });
    };

    // eslint-disable-next-line @next/next/no-img-element -- remote markdown images use standard img tags.
    return (
        <img
            src={imageSrc}
            alt={alt}
            {...props}
            className={clsx(
                openPreview && 'cursor-zoom-in rounded-md transition hover:opacity-95',
                className,
            )}
            onClick={handleClick}
            // Cloudflare hotlink protection 403s when Referer is our origin; a
            // direct tab open sends no Referer and succeeds. Strip it on markdown imgs.
            referrerPolicy="no-referrer"
        />
    );
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
