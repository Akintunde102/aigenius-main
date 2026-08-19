"use client";

import { createPortal } from "react-dom";
import { FiExternalLink, FiRotateCcw, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type DetailModalProps = Pick<
  DesktopSearchIndexState,
  | "portalMounted"
  | "detailModalOpen"
  | "closeDetailModal"
  | "selectedPath"
  | "detail"
  | "loadingDetail"
  | "detailError"
  | "detailModalTab"
  | "setDetailModalTab"
  | "previewLoading"
  | "previewError"
  | "previewBlob"
  | "rescanningPaths"
  | "rescanPath"
  | "openInOs"
  | "revealInOs"
  | "loadDiskPreviewForPath"
  | "detailJsonPretty"
  | "copyDetailJson"
>;

export function DetailModal(props: DetailModalProps) {
  const {
    portalMounted,
    detailModalOpen,
    closeDetailModal,
    selectedPath,
    detail,
    loadingDetail,
    detailError,
    detailModalTab,
    setDetailModalTab,
    previewLoading,
    previewError,
    previewBlob,
    rescanningPaths,
    rescanPath,
    openInOs,
    revealInOs,
    loadDiskPreviewForPath,
    detailJsonPretty,
    copyDetailJson,
  } = props;

  const modalHost =
    typeof document !== "undefined" ? (document.getElementById("modal-root") ?? document.body) : null;

  if (!portalMounted || !detailModalOpen || !modalHost) {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-5"
      onClick={closeDetailModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-index-detail-title"
        className={cn(
          "flex max-h-[min(92vh,940px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-600/90",
          "bg-[#161618] shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-700/90 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Indexed file
            </p>
            <h2
              id="search-index-detail-title"
              className="mt-0.5 truncate text-base font-semibold text-zinc-50 sm:text-lg"
            >
              {detail?.name ?? loadingDetail ? "Loading…" : selectedPath?.split(/[/\\]/).pop() ?? "Detail"}
            </h2>
            <p className="mt-1 font-mono text-[11px] leading-snug text-zinc-400 break-all sm:text-xs">{selectedPath ?? "—"}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {selectedPath ? (
              <>
                <button
                  type="button"
                  disabled={rescanningPaths.has(selectedPath)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border border-amber-900/60 bg-amber-950/20 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-950/40",
                    rescanningPaths.has(selectedPath) && "animate-pulse cursor-wait opacity-70",
                  )}
                  onClick={() => void rescanPath(selectedPath)}
                >
                  <FiRotateCcw className={cn("h-3.5 w-3.5", rescanningPaths.has(selectedPath) && "animate-spin")} />
                  {rescanningPaths.has(selectedPath) ? "Scanning..." : "Rescan"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
                  onClick={() => void openInOs(selectedPath)}
                  title="Open with default OS application"
                >
                  <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Open
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
                  onClick={() => void revealInOs(selectedPath)}
                >
                  Reveal
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-emerald-900/65 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-950/48"
                  onClick={() => {
                    setDetailModalTab("preview");
                    void loadDiskPreviewForPath(selectedPath, "preview");
                  }}
                >
                  Preview file
                </button>
              </>
            ) : null}
            <button
              type="button"
              aria-label="Close detail"
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-700/70 hover:text-zinc-100"
              onClick={closeDetailModal}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-zinc-700/70 px-3 pt-3 sm:px-5">
          <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-900/80 p-1">
            {(
              [
                ["overview", "Overview"],
                ["preview", "Disk preview"],
                ["json", "Raw JSON"],
              ] as const
            ).map(([id, lab]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                  detailModalTab === id ? "bg-zinc-700 text-zinc-50 shadow-sm" : "text-zinc-400 hover:text-zinc-200",
                )}
                onClick={() => setDetailModalTab(id)}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {detailModalTab === "preview" ? (
            <div className="flex min-h-[12rem] flex-col gap-3">
              {previewLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-24 rounded-lg bg-zinc-700/65" />
                  <div className="h-4 w-11/12 rounded bg-zinc-700/55" />
                </div>
              ) : previewError ? (
                <p className="text-sm font-medium text-amber-200">{previewError}</p>
              ) : previewBlob?.kind === "image" ? (
                <figure className="mx-auto flex max-h-[72vh] max-w-full flex-col gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL from local preview IPC */}
                  <img
                    src={previewBlob.url}
                    alt="Local file preview"
                    className="max-h-[62vh] w-auto max-w-full rounded-xl border border-zinc-700/80 bg-black object-contain"
                  />
                  <figcaption className="font-mono text-[11px] text-zinc-500">{previewBlob.mimeType}</figcaption>
                </figure>
              ) : previewBlob?.kind === "text" ? (
                <pre
                  className={cn(
                    "max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-700/80",
                    "bg-[#0d0d0f] px-4 py-3 font-mono text-xs text-zinc-200",
                  )}
                >
                  {previewBlob.text}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">No preview loaded.</p>
              )}
            </div>
          ) : loadingDetail && detailModalTab === "overview" ? (
            <div className="flex flex-col gap-3">
              <div className="h-4 animate-pulse rounded bg-zinc-700/70" />
              <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-700/50" />
              <div className="h-32 animate-pulse rounded-lg bg-zinc-800/60" />
            </div>
          ) : detailError ? (
            <p className="text-sm font-medium text-red-300">{detailError}</p>
          ) : detail ? (
            <>
              {detail.contentTruncated ? (
                <p className="mb-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-100/95">
                  <span className="font-semibold text-amber-50">Truncated:</span> the server returned a capped slice of{" "}
                  <code className="text-amber-200">content</code>. The database may hold more until you adjust the backend limit.
                </p>
              ) : null}

              {detailModalTab === "overview" ? (
                <div className="flex flex-col gap-6">
                  <dl className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-x-4 gap-y-2.5 text-sm sm:gap-y-3">
                    <dt className="font-medium text-zinc-500">Extension</dt>
                    <dd className="break-all font-mono text-zinc-100">{detail.extension || "—"}</dd>
                    <dt className="font-medium text-zinc-500">Modified</dt>
                    <dd className="text-zinc-100">
                      {new Date(detail.mtime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                      <span className="mt-0.5 block font-mono text-[11px] text-zinc-500">mtime_ms={detail.mtime}</span>
                    </dd>
                    <dt className="font-medium text-zinc-500">Tags</dt>
                    <dd className="break-all text-zinc-200">{detail.tags || "—"}</dd>
                    <dt className="font-medium text-zinc-500">Approx. content length</dt>
                    <dd className="font-mono text-zinc-100">{detail.content.length} chars (JS)</dd>
                  </dl>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Stored extracted content
                    </h3>
                    <div
                      tabIndex={0}
                      className={cn(
                        "max-h-[min(52vh,480px)] overflow-auto rounded-xl border border-zinc-700/80",
                        "bg-[#0d0d0f] px-4 py-3 shadow-inner sm:px-5 sm:py-4",
                        "text-sm leading-relaxed text-zinc-200 [tab-size:2]",
                      )}
                    >
                      <pre className="break-words font-sans whitespace-pre-wrap">{detail.content || "(empty)"}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-950/50"
                      onClick={() => void copyDetailJson()}
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre
                    tabIndex={0}
                    className={cn(
                      "max-h-[min(62vh,560px)] min-h-[12rem] overflow-auto rounded-xl border border-zinc-700/80",
                      "bg-[#0a0a0c] p-4 font-mono text-[11px] leading-snug text-zinc-200 sm:p-5 sm:text-xs",
                    )}
                  >
                    {detailJsonPretty}
                  </pre>
                </div>
              )}
            </>
          ) : detailModalTab === "overview" ? (
            <p className="text-sm text-zinc-500">No detail loaded.</p>
          ) : null}
        </div>
      </div>
    </div>,
    modalHost,
  );
}
