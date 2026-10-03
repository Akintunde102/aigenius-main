import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VideoJobProgressModal } from '../../src/app/components/modals/VideoJobProgressModal';
import { openVideoTrackingModal } from '../../src/app/components/modals/VideoTrackingManager';
import { Sparkles } from 'lucide-react';

function TestApp() {
    const slug = 'albino-woman-street-video-walking_job-4646dced';
    const linkTitle = '🎬 Track Video Progress: Albino Woman Walking';

    const handleOpenModal = (e: React.MouseEvent) => {
        e.preventDefault();
        openVideoTrackingModal({
            identifier: slug,
            title: 'Google: Veo 3.1 - Albino Woman Walking',
        });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center justify-center font-sans">
            {/* Mock Chat Container */}
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    AI Assistant Response (Mock Video Generation)
                </div>

                <div className="text-sm text-zinc-200 leading-relaxed space-y-3">
                    <p>
                        I&apos;ve submitted your cinematic video generation request using <strong>Google: Veo 3.1</strong>.
                        Rendering has started asynchronously in the cluster.
                    </p>
                    <p className="text-zinc-400 text-xs">
                        Estimated turnaround is ~120 seconds. You can track live percentage and countdown progress below:
                    </p>

                    {/* The Tracking Link in Chat Message */}
                    <div className="pt-2">
                        <a
                            id="track-video-link"
                            href={`/track/video/${slug}`}
                            onClick={handleOpenModal}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 transition shadow-sm cursor-pointer hover:border-blue-400"
                        >
                            <span>🎬</span>
                            <span>Track Video Progress: Albino Woman Walking</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Mounted Global Video Job Progress Modal */}
            <VideoJobProgressModal />
        </div>
    );
}

const rootEl = document.getElementById('root');
if (rootEl) {
    createRoot(rootEl).render(<TestApp />);
}
