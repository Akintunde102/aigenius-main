import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, Bot, User, Film, CheckCircle2, Download, ExternalLink } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    videoUrl?: string;
    timestamp: number;
}

function WebhookChatInjectionTestApp() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'msg-1',
            role: 'user',
            content: 'Generate a futuristic cyberpunk city video with flying vehicles at dusk.',
            timestamp: Date.now() - 30000,
        },
        {
            id: 'msg-2',
            role: 'assistant',
            content: "I've queued your cinematic video request with Google: Veo 3.1.\n\nJob ID: `openrouter-job-cyberpunk-456`\nEstimated turnaround: ~120s\n\n[🎬 Track Video Progress: Cyberpunk City](/track/video/cyberpunk-city_openrouter-job-cyberpunk-456)",
            timestamp: Date.now() - 25000,
        },
    ]);
    const [webhookReceivedNotification, setWebhookReceivedNotification] = useState<string | null>(null);

    // Live EventSource listening for conversation_updated
    useEffect(() => {
        const eventSource = new EventSource('/api/mock-sse-events');

        eventSource.addEventListener('conversation_updated', (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log('[SSE EVENT] conversation_updated received:', data);
                if (data.injectedMessage) {
                    setWebhookReceivedNotification('⚡ OpenRouter Webhook Received: Video Delivered & Injected!');
                    setMessages((prev) => [...prev, data.injectedMessage]);
                }
            } catch (err) {
                console.error('[SSE EVENT] Failed to parse event payload:', err);
            }
        });

        return () => {
            eventSource.close();
        };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center font-sans">
            <div className="w-full max-w-3xl space-y-6">
                {/* Header Banner */}
                <div className="flex items-center justify-between p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                                AI Genius Chat — Method B Webhook Injection
                                <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    Live SSE Active
                                </span>
                            </h1>
                            <p className="text-xs text-zinc-400">
                                Testing real-time chat injection upon OpenRouter video webhook receipt
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status toast when webhook arrives */}
                {webhookReceivedNotification && (
                    <div id="webhook-toast" className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{webhookReceivedNotification}</span>
                    </div>
                )}

                {/* Chat transcript */}
                <div className="space-y-4">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex gap-3 p-5 rounded-2xl border ${
                                m.role === 'user'
                                    ? 'bg-zinc-900/40 border-zinc-800/80 ml-8'
                                    : 'bg-zinc-900 border-zinc-800 mr-8 shadow-xl'
                            }`}
                        >
                            <div className="flex-shrink-0">
                                {m.role === 'user' ? (
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-3 overflow-hidden text-sm leading-relaxed">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {m.role === 'user' ? 'User' : 'Assistant (Veo 3.1)'}
                                </div>

                                <div className="text-zinc-200 whitespace-pre-line">
                                    {m.content}
                                </div>

                                {m.videoUrl && (
                                    <div id="injected-video-container" className="pt-2 space-y-3">
                                        <div className="relative rounded-xl overflow-hidden border border-zinc-700/80 bg-black/60 aspect-video shadow-2xl">
                                            <video
                                                id="injected-video-player"
                                                src={m.videoUrl}
                                                controls
                                                autoPlay
                                                muted
                                                loop
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a
                                                id="injected-video-download"
                                                href={m.videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download Video (MP4)</span>
                                            </a>
                                            <a
                                                href={m.videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>Open in new tab</span>
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const rootEl = document.getElementById('root');
if (rootEl) {
    createRoot(rootEl).render(<WebhookChatInjectionTestApp />);
}
