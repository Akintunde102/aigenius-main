'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { openModelGeneratedLink } from './markdown-external-link.utils';

type PreviewPosition = {
    top: number;
    left: number;
};

type MarkdownExternalLinkProps = {
    href: string;
    host: string;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    children?: React.ReactNode;
};

const VIEWPORT_PAD = 8;
const LINK_GAP = 6;

export function MarkdownExternalLink({
    href,
    host,
    className,
    onClick,
    children,
}: MarkdownExternalLinkProps) {
    const tooltipId = useId();
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<PreviewPosition | null>(null);

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null);
            return;
        }
        const anchor = anchorRef.current;
        const preview = previewRef.current;
        if (!anchor || !preview) {
            return;
        }
        const rect = anchor.getBoundingClientRect();
        const box = preview.getBoundingClientRect();
        let left = rect.left;
        const maxLeft = window.innerWidth - VIEWPORT_PAD - box.width;
        if (left > maxLeft) {
            left = Math.max(VIEWPORT_PAD, maxLeft);
        }
        let top = rect.bottom + LINK_GAP;
        if (top + box.height > window.innerHeight - VIEWPORT_PAD) {
            top = Math.max(VIEWPORT_PAD, rect.top - LINK_GAP - box.height);
        }
        setPosition({ top, left });
    }, [open, href]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const hide = () => setOpen(false);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, [open]);

    return (
        <>
            <a
                ref={anchorRef}
                href={href}
                className={className}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={open ? tooltipId : undefined}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={(event) => {
                    onClick?.(event);
                    if (event.defaultPrevented) {
                        return;
                    }
                    event.preventDefault();
                    openModelGeneratedLink(href);
                }}
            >
                {children}
            </a>
            {open && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={previewRef}
                          id={tooltipId}
                          role="tooltip"
                          className="markdown-link-preview"
                          style={{
                              top: position?.top ?? 0,
                              left: position?.left ?? 0,
                              visibility: position ? 'visible' : 'hidden',
                          }}
                      >
                          <div className="markdown-link-preview__host">{host}</div>
                          <div className="markdown-link-preview__url">{href}</div>
                          <div className="markdown-link-preview__hint">Opens in your browser</div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
