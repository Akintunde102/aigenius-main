'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/providers/ThemeProvider';

interface MermaidRendererProps {
    chart: string;
    id?: string;
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

/**
 * Dynamically imports mermaid and renders the provided chart.
 * Used within MarkdownRenderer to visualize ```mermaid blocks.
 */
export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
    chart,
    id,
    theme,
}) => {
    const { resolvedTheme } = useTheme();
    const mermaidTheme = theme ?? (resolvedTheme === 'dark' ? 'dark' : 'default');
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const render = async () => {
            try {
                const mermaid = (await import('mermaid')).default;

                mermaid.initialize({
                    startOnLoad: false,
                    theme: mermaidTheme,
                    securityLevel: 'loose',
                    fontFamily: 'inherit',
                });

                // Check if valid before rendering to handle streaming gracefully
                try {
                    await mermaid.parse(chart);
                } catch {
                    // While streaming, it's normal to have invalid syntax.
                    // We don't set an error yet to allow silent fallback to code.
                    if (isMounted) setSvg('');
                    return;
                }

                const uniqueId = id || `mermaid-${Math.random().toString(36).substring(2, 11)}`;
                const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);

                if (isMounted) {
                    setSvg(renderedSvg);
                    setError(null);
                }
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (isMounted) {
                    setError('Failed to render Mermaid diagram');
                }
            }
        };

        render();
        return () => { isMounted = false; };
    }, [chart, id, mermaidTheme]);

    // Silent fallback: If it's invalid or rendering, show as a code block
    // but without the copy button (to keep it clean).
    if (!svg && !error) {
        return (
            <pre className="mermaid-fallback my-4 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[13px] whitespace-pre-wrap break-all text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {chart}
            </pre>
        );
    }

    if (error) {
        return (
            <div className="mermaid-error my-4 rounded-lg border border-red-100 bg-red-50/50 p-4 text-xs text-red-600 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                    <span>⚠️</span> Diagram Render Error
                </p>
                <pre className="overflow-x-auto rounded border border-red-50 bg-white/40 p-2 font-mono text-[11px] dark:border-red-900/40 dark:bg-zinc-950/60 dark:text-red-200">
                    {chart}
                </pre>
            </div>
        );
    }

    return (
        <div
            className="mermaid-container my-6 flex max-w-full justify-center overflow-x-auto rounded-xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-zinc-700 dark:bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default MermaidRenderer;
