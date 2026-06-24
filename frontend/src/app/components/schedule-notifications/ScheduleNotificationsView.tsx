"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { workflowCanvasSurfaceStyle, workflowShellBgStyle } from "@/app/components/workflows/workflow-info";
import {
  deleteScheduleNotification,
  fetchScheduleNotifications,
  markAllScheduleNotificationsRead,
  type ScheduleRunNotificationDto,
} from "@/lib/schedule-notifications/scheduleNotificationsApi";
import { SCHEDULE_NOTIFICATIONS_REFRESH_EVENT } from "@/lib/hooks/useScheduleNotificationEvents";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function stageLabel(n: ScheduleRunNotificationDto): string {
  if (n.phase === "started") return "Started";
  if (n.outcome === "completed") return "Finished";
  if (n.outcome === "failed") return "Failed";
  return "Cancelled";
}

function stageDotClass(n: ScheduleRunNotificationDto): string {
  if (n.phase === "started") return "bg-teal-500 ring-2 ring-white";
  if (n.outcome === "completed") return "bg-emerald-500 ring-2 ring-white";
  if (n.outcome === "failed") return "bg-rose-500 ring-2 ring-white";
  return "bg-slate-400 ring-2 ring-white";
}

function groupNotifications(items: ScheduleRunNotificationDto[]): ScheduleRunNotificationDto[][] {
  const byRun = new Map<string, ScheduleRunNotificationDto[]>();
  for (const row of items) {
    const list = byRun.get(row.runId) ?? [];
    list.push(row);
    byRun.set(row.runId, list);
  }
  const groupedValues = Array.from(byRun.values());
  for (const list of groupedValues) {
    list.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
  }
  const groups = groupedValues;
  groups.sort((a, b) => {
    const ta = Math.max(...a.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const tb = Math.max(...b.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    return tb - ta;
  });
  return groups;
}

export default function ScheduleNotificationsView() {
  const router = useRouter();
  const [items, setItems] = useState<ScheduleRunNotificationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const loadPage = useCallback(async (opts: { append: boolean; cursorVal?: string | null }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchScheduleNotifications({
        limit: 40,
        cursor: opts.cursorVal ?? undefined,
      });
      setItems((prev) => (opts.append ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage({ append: false });
  }, [loadPage]);

  useEffect(() => {
    const onRefresh = () => {
      void loadPage({ append: false });
    };
    window.addEventListener(SCHEDULE_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SCHEDULE_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [loadPage]);

  const groups = useMemo(() => groupNotifications(items), [items]);

  const handleMarkAllRead = async () => {
    setBusyAction(true);
    try {
      await markAllScheduleNotificationsRead();
      await loadPage({ append: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduleNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* keep silent; optional toast */
    }
  };

  const loadMore = () => {
    if (!nextCursor) return;
    void loadPage({ append: true, cursorVal: nextCursor });
  };

  return (
    <div className="flex min-h-screen flex-col" style={workflowShellBgStyle()}>
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px]">
        <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800/90 bg-[#141416] text-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-900/50 text-slate-300 transition hover:border-sky-500/40 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-100">Schedule activity</h1>
                <p className="text-[11px] text-slate-500">Quiet timeline of scheduled workflow runs</p>
              </div>
            </div>
            <button
              type="button"
              disabled={busyAction || items.length === 0}
              onClick={() => void handleMarkAllRead()}
              className="rounded-lg border border-slate-600/80 bg-slate-800/40 px-3 py-1.5 text-[12px] font-medium text-slate-200 transition hover:border-sky-500/35 hover:bg-slate-700 disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
        </header>

        <div className="workflow-scroll-light relative flex min-h-0 flex-1 flex-col overflow-auto overscroll-y-auto">
          <main className="flex min-h-full flex-1 flex-col" style={workflowCanvasSurfaceStyle()}>
            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2.5 text-[13px] text-rose-900 shadow-sm">{error}</p>
              ) : null}

              {loading && items.length === 0 ? (
                <p className="text-center text-[13px] text-slate-600">Loading…</p>
              ) : null}

              {!loading && items.length === 0 && !error ? (
                <p className="text-center text-[13px] text-slate-600">No scheduled run notifications yet.</p>
              ) : null}

              <ul className="space-y-4">
                {groups.map((group) => {
                  const first = group[0];
                  if (!first) return null;
                  const execHref = `/workflow/${first.workflowId}/executions?runId=${encodeURIComponent(first.runId)}`;
                  const last = group[group.length - 1];
                  const summaryHint =
                    last != null ? `${stageLabel(last)} · ${formatWhen(last.createdAt)}` : "";
                  return (
                    <li
                      key={first.runId}
                      className="overflow-hidden rounded-xl border border-[rgba(58,71,87,0.15)] bg-white shadow-[0_8px_28px_-18px_rgba(31,42,55,0.35)] ring-1 ring-slate-900/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100/95 bg-[rgba(255,255,255,0.98)] px-4 py-3 sm:px-5">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-ink-900)]">
                          {first.workflowName}
                        </p>
                        <Link
                          href={execHref}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200/95 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:border-teal-300/80 hover:bg-teal-50/60 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35"
                        >
                          Open execution
                        </Link>
                      </div>

                      <details className="group">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-left transition hover:bg-slate-50/90 sm:px-5 [&::-webkit-details-marker]:hidden">
                          <span className="flex min-w-0 items-center gap-2">
                            <ChevronDown
                              className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                              aria-hidden
                            />
                            <span className="text-[12px] font-semibold text-slate-800">Run stages</span>
                            <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-600">
                              {group.length}
                            </span>
                          </span>
                          <span className="min-w-0 max-w-full truncate text-right text-[11px] text-slate-500 sm:max-w-[50%]" title={summaryHint}>
                            {summaryHint}
                          </span>
                        </summary>
                        <div className="relative border-t border-slate-100 bg-gradient-to-b from-slate-50/55 to-white px-4 pb-4 pt-3 sm:px-5">
                          <div
                            className="absolute bottom-4 left-[1.35rem] top-3 w-px bg-slate-200 sm:left-[1.55rem]"
                            aria-hidden
                          />
                          <ol className="relative space-y-3">
                            {group.map((n) => (
                              <li key={n.id} className="flex gap-3 pl-0.5">
                                <div
                                  className={`relative z-[1] mt-1.5 h-2 w-2 shrink-0 rounded-full ${stageDotClass(n)}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="text-[12px] font-semibold text-slate-800">{stageLabel(n)}</span>
                                    <span className="text-[10px] tabular-nums text-slate-500">{formatWhen(n.createdAt)}</span>
                                  </div>
                                  {n.outcome === "failed" ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                      Something went wrong. Open the execution for details.
                                    </p>
                                  ) : n.message ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{n.message}</p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(n.id)}
                                  className="shrink-0 self-start rounded-md border border-transparent px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-800"
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>

              {nextCursor ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => loadMore()}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:border-teal-300/70 hover:bg-teal-50/50 disabled:opacity-50"
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
