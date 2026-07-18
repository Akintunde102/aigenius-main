'use client';

import React, { useCallback, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';
import { FiCopy } from 'react-icons/fi';

type PreProps = React.ComponentPropsWithoutRef<'pre'>;

export function PreWithCopy({ className, children, ...props }: PreProps) {
    const preRef = useRef<HTMLPreElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        const text = preRef.current?.textContent ?? '';
        if (!text) return;
        const ok = copy(text);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        }
    }, []);

    return (
        <div className="markdown-code-block-shell group relative min-w-0 max-w-full">
            <button
                type="button"
                className="markdown-code-block-copy"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy code'}
                title={copied ? 'Copied' : 'Copy code'}
            >
                {copied ? (
                    <span className="markdown-code-copy-done" aria-hidden>
                        ✓
                    </span>
                ) : (
                    <FiCopy size={13} strokeWidth={1.75} aria-hidden />
                )}
            </button>
            <pre ref={preRef} className={clsx('markdown-code-block-pre', className)} {...props}>
                {children}
            </pre>
        </div>
    );
}

/**
 * Block fences / indented blocks: `inline === false` from the markdown AST, or highlighted `code` classes.
 * Inline backticks: `inline === true` (no language class).
 */
export function isMarkdownBlockCode(className: string | undefined, inline?: boolean | undefined): boolean {
    if (inline === true) return false;
    if (inline === false) return true;
    return Boolean(className?.includes('language-') || className?.includes('hljs'));
}
