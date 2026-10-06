"use client";

import { useEffect, useState, useCallback } from "react";
import { FiDownload, FiRotateCw, FiCheck, FiAlertCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// ── Boundary types (Electron main → renderer IPC payloads) ──────────────
interface UpdateAvailableInfo {
  version: string;
}

interface UpdateProgressInfo {
  percent: number; // 0–100
  transferredMB: number;
  totalMB: number;
  bytesPerSecond: number;
}

interface UpdateErrorInfo {
  message: string;
}

// Removed declare global block to avoid TS property declaration conflict.

type UpdateState = "idle" | "available" | "downloading" | "downloaded" | "error";

interface AutoUpdaterUIProps {
  updateState: UpdateState;
  version: string;
  progress: UpdateProgressInfo | null;
  errorMessage: string;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

function formatEta(progress: UpdateProgressInfo | null): string {
  if (!progress || progress.bytesPerSecond <= 0) return "";
  const remainingMB = progress.totalMB - progress.transferredMB;
  const seconds = Math.max(1, Math.round((remainingMB * 1024 * 1024) / progress.bytesPerSecond));
  return seconds < 60 ? `${seconds}s left` : `${Math.ceil(seconds / 60)}m left`;
}

export function AutoUpdaterNotificationUI({
  updateState,
  version,
  progress,
  errorMessage,
  onDownload,
  onInstall,
  onDismiss,
  onRetry,
}: AutoUpdaterUIProps) {
  return (
    <AnimatePresence>
      {updateState !== "idle" && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-[9999] w-[336px] rounded-lg border border-border bg-card dark:bg-[#0b0b0d] text-card-foreground shadow-[var(--shadow-elegant)]"
        >
          <div className="p-4">
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[#f97316] relative top-[3px]">
                    {updateState === "available" && <FiDownload size={15} />}
                    {updateState === "downloading" && <FiDownload size={15} className="animate-pulse" />}
                    {updateState === "downloaded" && <FiCheck size={15} />}
                    {updateState === "error" && <FiAlertCircle size={15} className="text-destructive" />}
                  </span>
                  <h3 className="truncate text-[13px] font-medium leading-none">
                    {updateState === "available" && `Update available${version ? ` · ${version}` : ""}`}
                    {updateState === "downloading" && "Downloading update"}
                    {updateState === "downloaded" && "Ready to install"}
                    {updateState === "error" && "Update failed"}
                  </h3>
                  {updateState === "downloading" && progress && (
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {Math.round(progress.percent)}%
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  {updateState === "available" &&
                    `Version ${version} is ready with performance improvements and fixes.`}
                  {updateState === "downloading" &&
                    progress &&
                    `${progress.transferredMB.toFixed(1)} of ${progress.totalMB.toFixed(1)} MB${formatEta(progress) ? ` · ${formatEta(progress)}` : ""
                    }`}
                  {updateState === "downloaded" && "Restart to finish installing."}
                  {updateState === "error" && (errorMessage || "Something went wrong. Try again.")}
                </p>

                {updateState === "downloading" && (
                  <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-[#f97316] transition-[width] duration-300 ease-out"
                      style={{ width: `${progress?.percent ?? 0}%` }}
                    />
                  </div>
                )}

                {updateState !== "downloading" && (
                  <div className="mt-3 flex items-center justify-end gap-3">
                    {updateState === "available" && (
                      <>
                        <button
                          onClick={onDismiss}
                          className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Later
                        </button>
                        <button
                          onClick={onDownload}
                          className="rounded-md bg-[#f97316] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#ea580c]"
                        >
                          Download
                        </button>
                      </>
                    )}
                    {updateState === "downloaded" && (
                      <>
                        <button
                          onClick={onDismiss}
                          className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Postpone
                        </button>
                        <button
                          onClick={onInstall}
                          className="rounded-md bg-[#f97316] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#ea580c]"
                        >
                          Restart & Install
                        </button>
                      </>
                    )}
                    {updateState === "error" && (
                      <>
                        <button
                          onClick={onDismiss}
                          className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={onRetry}
                          className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-[12px] font-medium text-destructive-foreground transition-opacity hover:opacity-90"
                        >
                          <FiRotateCw size={12} /> Retry
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AutoUpdaterNotification({ previewMode = false }: { previewMode?: boolean }) {
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState<UpdateProgressInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (previewMode) {
      setUpdateState("available");
      setVersion("2.4.0");
      return;
    }

    const api = window.aigeniusDesktop;
    if (!api) return;

    const unbindAvailable = api.onUpdateAvailable((info: UpdateAvailableInfo) => {
      setUpdateState("available");
      setVersion(info.version);
    });

    const unbindProgress = api.onUpdateProgress((info: UpdateProgressInfo) => {
      setProgress(info);
    });

    const unbindDownloaded = api.onUpdateDownloaded(() => {
      setUpdateState("downloaded");
    });

    const unbindError = api.onUpdateError((info: UpdateErrorInfo) => {
      // Only display the error dialog if the user was actively attempting to download
      setUpdateState((prev) => {
        if (prev === "downloading") {
          setErrorMessage(info.message);
          return "error";
        }
        console.warn("[AutoUpdater] Passive update check notice:", info.message);
        return prev;
      });
    });

    const checkTimer = setTimeout(() => api.checkForUpdates(), 5000);

    return () => {
      unbindAvailable();
      unbindProgress();
      unbindDownloaded();
      unbindError();
      clearTimeout(checkTimer);
    };
  }, [previewMode]);

  const handleDownload = useCallback(() => {
    setUpdateState("downloading");
    if (previewMode) {
      let pct = 0;
      const interval = setInterval(() => {
        pct += 20;
        setProgress({ percent: pct, transferredMB: (pct / 100) * 48.1, totalMB: 48.1, bytesPerSecond: 2_400_000 });
        if (pct >= 100) {
          clearInterval(interval);
          setUpdateState("downloaded");
        }
      }, 500);
      return;
    }
    window.aigeniusDesktop?.downloadUpdate();
  }, [previewMode]);

  const handleInstall = useCallback(() => {
    if (!previewMode) window.aigeniusDesktop?.installUpdate();
  }, [previewMode]);

  const handleRetry = useCallback(() => {
    setErrorMessage("");
    setUpdateState("available");
  }, []);

  const handleDismiss = useCallback(() => {
    setUpdateState("idle");
    setProgress(null);
  }, []);

  return (
    <AutoUpdaterNotificationUI
      updateState={updateState}
      version={version}
      progress={progress}
      errorMessage={errorMessage}
      onDownload={handleDownload}
      onInstall={handleInstall}
      onDismiss={handleDismiss}
      onRetry={handleRetry}
    />
  );
}