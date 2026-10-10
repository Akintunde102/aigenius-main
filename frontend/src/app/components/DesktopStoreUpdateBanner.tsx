"use client";

import { useCallback, useEffect, useState } from "react";
import { RenderErrorBoundary } from "@/app/components/RenderErrorBoundary";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";

type ShellUpdatePayload = {
  requiredShellVersion: string;
  installedShellVersion: string;
  updateChannel: "microsoft-store" | "standalone";
};

function DesktopStoreUpdateBannerInner() {
  const [updateInfo, setUpdateInfo] = useState<ShellUpdatePayload | null>(null);
  const [dismissedForVersion, setDismissedForVersion] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isAigeniusDesktopRuntime()) {
      return;
    }
    const bridge = window.aigeniusDesktop;
    if (!bridge?.onShellUpdateRequired) {
      return;
    }

    const unsub = bridge.onShellUpdateRequired((payload) => {
      setUpdateInfo(payload);
    });

    void bridge.checkUiOta?.();

    return unsub;
  }, []);

  const handleOpenUpdate = useCallback(() => {
    void window.aigeniusDesktop?.openShellUpdatePage?.();
  }, []);

  const handleDismiss = useCallback(() => {
    if (updateInfo) {
      setDismissedForVersion(updateInfo.requiredShellVersion);
    }
  }, [updateInfo]);

  if (
    !updateInfo ||
    dismissedForVersion === updateInfo.requiredShellVersion
  ) {
    return null;
  }

  const isStore = updateInfo.updateChannel === "microsoft-store";
  const title = isStore
    ? "Update available in Microsoft Store"
    : "A new desktop version is required";
  const detail = isStore
    ? `This app (${updateInfo.installedShellVersion}) needs version ${updateInfo.requiredShellVersion} or newer to receive the latest features. Open the Store to update.`
    : `Installed ${updateInfo.installedShellVersion}; version ${updateInfo.requiredShellVersion} or newer is required. Download the latest installer.`;

  return (
    <div
      role="status"
      className="fixed left-0 right-0 z-[110] flex justify-center px-3"
      style={{
        top: "calc(var(--aigenius-desktop-titlebar-top, 0px) + 4px)",
      }}
    >
      <div
        className="flex max-w-2xl flex-wrap items-center gap-3 rounded-lg border px-4 py-3 shadow-md"
        style={{
          backgroundColor: "var(--modal-bg, var(--surface-elevated, #1a1a1a))",
          borderColor: "var(--modal-border, rgba(255,255,255,0.12))",
          color: "var(--modal-fg, inherit)",
        }}
      >
        <div className="min-w-[200px] flex-1 text-sm">
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 opacity-80">{detail}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="app-modal-btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
            onClick={handleOpenUpdate}
          >
            {isStore ? "Open Microsoft Store" : "Get update"}
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm opacity-80 hover:opacity-100"
            onClick={handleDismiss}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesktopStoreUpdateBanner() {
  if (!isAigeniusDesktopRuntime()) {
    return null;
  }

  return (
    <RenderErrorBoundary logLabel="[desktop-store-update-banner]">
      <DesktopStoreUpdateBannerInner />
    </RenderErrorBoundary>
  );
}
