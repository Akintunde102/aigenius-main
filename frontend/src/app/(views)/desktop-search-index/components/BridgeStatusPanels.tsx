"use client";

import type { DesktopBridgePhase } from "../desktop-search-index.types";

type BridgeStatusPanelsProps = {
  bridgePhase: DesktopBridgePhase;
  canBrowse: boolean;
};

export function BridgeStatusPanels({ bridgePhase, canBrowse }: BridgeStatusPanelsProps) {
  if (bridgePhase === "pending") {
    return <p className="text-sm text-zinc-400">Connecting to desktop shell…</p>;
  }

  if (bridgePhase === "unavailable") {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-sm text-zinc-300">
        <p className="font-medium text-zinc-100">No desktop bridge found (nothing will load here).</p>
        <p>
          This page talks to SQLite through the Electron preload (
          <code className="text-amber-200/90">window.aigeniusDesktop</code>
          ). Use the <strong className="text-zinc-100">AIGenius desktop app</strong>, not Chrome.
        </p>
      </div>
    );
  }

  if (!canBrowse) {
    return (
      <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-100">
        This build does not expose <code className="mx-1 text-amber-50">searchBrowse</code>.
      </div>
    );
  }

  return null;
}
