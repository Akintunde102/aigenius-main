'use client';

import React, { useEffect, useState } from 'react';

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
    theme = 'default' 
}) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        const render = async () => {
            try {
                const mermaid = (await import('mermaid')).default;
                
                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme,
                    securityLevel: 'loose',
                    fontFamily: 'inherit',
                });
                
                // Check if valid before rendering to handle streaming gracefully
                try {
                    await mermaid.parse(chart);
                } catch (err) {
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
    }, [chart, id, theme]);

    // Silent fallback: If it's invalid or rendering, show as a code block
    // but without the copy button (to keep it clean).
    if (!svg && !error) {
        return (
            <pre className="mermaid-fallback my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-mono whitespace-pre-wrap break-all text-slate-600">
                {chart}
            </pre>
        );
    }

    if (error) {
        return (
            <div className="mermaid-error my-4 p-4 bg-red-50/50 border border-red-100 rounded-lg text-red-600 text-xs shadow-sm">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <span>⚠️</span> Diagram Render Error
                </p>
                <pre className="overflow-x-auto p-2 bg-white/40 rounded border border-red-50 font-mono text-[11px]">
                    {chart}
                </pre>
            </div>
        );
    }

    return (
        <div 
            className="mermaid-container flex justify-center my-6 overflow-x-auto max-w-full bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default MermaidRenderer;
