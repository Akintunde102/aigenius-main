"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Clock, Loader2, MoreHorizontal, Power, Search, Workflow } from "lucide-react";
import { refreshAccessToken } from "@/lib/api/auth-client";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { Button } from "@/app/components/ui/button";
import { fetchAllSchedules, clearWorkflowSchedule, WorkflowsApiError, type WorkflowScheduleListItem } from "./workflowsApi";
import { workflowCanvasSurfaceStyle, workflowShellBgStyle } from "./workflow-info";

function isAuthProblem(error: unknown) {
  if (error instanceof WorkflowsApiError && error.statusCode === 401) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("authentication required") || message.includes("authorization error");
}

async function loadSchedules() {
  try {
    return await fetchAllSchedules();
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchAllSchedules();
  }
}

function formatNextRun(iso?: string | null) {
  if (!iso) return "Not scheduled";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    
    if (diff < 0) return "Just now";
    
    // Relative time for near future
    if (diff < 60 * 1000) return "In less than a minute";
    if (diff < 60 * 60 * 1000) return `In ${Math.floor(diff / 60000)} minutes`;
    if (diff < 24 * 60 * 60 * 1000) return `In ${Math.floor(diff / 3600000)} hours`;
    
    return d.toLocaleString(undefined, { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return iso;
  }
}

export default function SchedulesListView() {
  useTokenHandler();
  const [items, setItems] = useState<WorkflowScheduleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [menuScheduleId, setMenuScheduleId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setAuthBlocked(false);
    try {
      const rows = await loadSchedules();
      setItems(rows);
    } catch (error) {
      if (isAuthProblem(error)) {
        setAuthBlocked(true);
      } else {
        setLoadError(error instanceof Error ? error.message : "Could not load schedules.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(async (workflowId: string, scheduleName: string) => {
    if (!window.confirm(`Are you sure you want to clear the schedule "${scheduleName || "Untitled"}"? recurring runs will stop.`)) {
      return;
    }

    setClearingId(workflowId);
    try {
      await clearWorkflowSchedule(workflowId);
      await fetchList();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to clear schedule");
    } finally {
      setClearingId(null);
      setMenuScheduleId(null);
    }
  }, [fetchList]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!menuScheduleId) return;
    const close = () => setMenuScheduleId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuScheduleId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => {
      const hay = `${s.name} ${s.workflowName} ${s.expression}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  if (authBlocked) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
        style={workflowShellBgStyle()}
      >
        <p className="text-sm text-slate-700">Sign in to view and manage your schedules.</p>
        <Link
          href="/login"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={workflowShellBgStyle()}>
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px]">
        <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800/90 bg-[#141416] text-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
          <div className="flex min-h-9 flex-col gap-2 px-2.5 py-2 sm:min-h-10 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-x-2 sm:px-3 sm:py-0">
            <div className="flex min-h-9 flex-nowrap items-center gap-x-1.5 sm:min-h-10">
              <Link
                href="/workflows"
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              >
                <ArrowLeft className="h-3 w-3" aria-hidden />
                Workflows
              </Link>
              <span className="select-none text-slate-600" aria-hidden>
                ›
              </span>
              <span className="truncate text-[12px] font-medium text-slate-100">All schedules</span>
            </div>
            <div className="relative min-h-[2rem] min-w-0 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schedules…"
                aria-label="Search schedules"
                className="h-8 w-full rounded-md border border-slate-600/80 bg-slate-900/60 py-1.5 pl-8 pr-2.5 text-[12px] text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 sm:h-7"
              />
            </div>
          </div>
        </header>

        <div className="workflow-scroll-light relative flex min-h-0 flex-1 flex-col overflow-auto overscroll-y-auto">
          <div className="flex min-h-full flex-1 flex-col" style={workflowCanvasSurfaceStyle()}>
            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                  <p className="text-sm text-slate-600">Loading schedules…</p>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <p className="max-w-md text-sm leading-relaxed text-slate-700">{loadError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-slate-200 bg-white/90 shadow-sm"
                    onClick={() => void fetchList()}
                  >
                    Retry
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                    <Calendar className="h-7 w-7 text-slate-500" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {items.length === 0 ? "No schedules yet" : "No schedules match your search"}
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                    {items.length === 0
                      ? "Set up recurring runs for your workflows to automate tasks on a schedule."
                      : "Try a different search term or clear the box."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((s) => {
                    const nextRun = formatNextRun(s.nextRunAt);
                    return (
                      <div key={`${s.workflowId}-${s.id}`} className="relative rounded-xl border border-[rgba(58,71,87,0.15)] bg-white shadow-[0_8px_28px_-18px_rgba(31,42,55,0.35)] transition hover:shadow-[0_12px_32px_-16px_rgba(31,42,55,0.4)]">
                        <div className="group block text-left">
                          <div className="flex items-center gap-2 rounded-t-xl border-b border-[rgba(58,71,87,0.08)] bg-[rgba(255,255,255,0.92)] px-3 py-2.5 pr-11">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${s.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>
                              <Power className="h-3.5 w-3.5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[var(--app-ink-800)]">
                                {s.name || "Untitled Schedule"}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-slate-500">
                                <Workflow className="h-2.5 w-2.5" />
                                {s.workflowName}
                              </span>
                            </div>
                          </div>
                          <div className="rounded-b-xl border-b border-[rgba(58,71,87,0.08)] bg-[rgba(246,248,252,0.7)] px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Next Run</p>
                                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--app-ink-800)]">
                                  <Clock className="h-3 w-3 text-sky-500" />
                                  {nextRun}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Rule</p>
                                <p className="mt-1 text-[11px] font-medium text-[var(--app-ink-700)]">
                                  {s.ruleType === "cron" ? "Recurring" : "One-time"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-[rgba(58,71,87,0.08)] bg-white/60 px-2 py-1.5">
                                <p className="truncate font-mono text-[10px] text-slate-600">
                                  {s.expression}
                                </p>
                            </div>
                          </div>
                        </div>
                        <div className="absolute right-2 top-2 z-10">
                          <button
                            type="button"
                            aria-label="Schedule actions"
                            className="rounded-md border border-[rgba(58,71,87,0.12)] bg-white/95 p-1 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuScheduleId((current) => (current === s.id ? null : s.id));
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                          {menuScheduleId === s.id ? (
                            <div
                              className="absolute right-0 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-[11px] shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/workflow/${s.workflowId}`}
                                className="block px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                Edit Workflow
                              </Link>
                              <Link
                                href={`/workflow/${s.workflowId}/executions`}
                                className="block px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                View History
                              </Link>
                              <button
                                type="button"
                                disabled={clearingId === s.workflowId}
                                className="w-full border-t border-slate-100 px-2.5 py-1.5 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleClear(s.workflowId, s.name);
                                }}
                              >
                                {clearingId === s.workflowId ? "Clearing..." : "Clear Schedule"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
);
}
