"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Calendar, Layers, Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { FiTool } from "react-icons/fi";
import { refreshAccessToken } from "@/lib/api/auth-client";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { Button } from "@/app/components/ui/button";
import { scheduleWorkflowShellPrefetch } from "@/lib/workflow-shell-prefetch";
import { fetchWorkflows, deleteWorkflow, WorkflowsApiError, type WorkflowRecord } from "./workflowsApi";
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

async function loadList() {
  try {
    return await fetchWorkflows();
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflows();
  }
}

function formatUpdatedAt(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function newWorkflowHref() {
  return `/workflows/new?fresh=${Date.now()}`;
}

export default function WorkflowsListView() {
  useTokenHandler();
  const router = useRouter();
  const [items, setItems] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [menuWorkflowId, setMenuWorkflowId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setAuthBlocked(false);
    try {
      const rows = await loadList();
      setItems(rows);
    } catch (error) {
      if (isAuthProblem(error)) {
        setAuthBlocked(true);
      } else {
        setLoadError(error instanceof Error ? error.message : "Could not load workflows.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the workflow "${name || "Untitled"}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteWorkflow(id);
      await fetchList();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete workflow");
    } finally {
      setDeletingId(null);
      setMenuWorkflowId(null);
    }
  }, [fetchList]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    scheduleWorkflowShellPrefetch(router, items.map((row) => row.id));
  }, [router, items]);

  useEffect(() => {
    if (!menuWorkflowId) return;
    const close = () => setMenuWorkflowId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuWorkflowId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((w) => {
      const hay = `${w.name} ${w.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  if (authBlocked) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
        style={workflowShellBgStyle()}
      >
        <p className="text-sm text-slate-700">Sign in to view and edit your workflows.</p>
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
        {/* List header: same chrome as studio title bar, different actions (search + new, no save). */}
        <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800/90 bg-[#141416] text-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
          <div className="flex min-h-9 flex-col gap-2 px-2.5 py-2 sm:min-h-10 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-x-2 sm:px-3 sm:py-0">
            <div className="flex min-h-9 flex-nowrap items-center gap-x-1.5 sm:min-h-10">
              <Link
                href="/"
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              >
                <ArrowLeft className="h-3 w-3" aria-hidden />
                Back
              </Link>
              <span className="select-none text-slate-600" aria-hidden>
                ›
              </span>
              <span className="truncate text-[12px] font-medium text-slate-100">All workflows</span>
            </div>
            <div className="relative min-h-[2rem] min-w-0 flex-1 sm:max-w-md">
              <label htmlFor="search-workflows" className="sr-only">
                Search workflows
              </label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                id="search-workflows"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows…"
                aria-label="Search workflows"
                className="h-8 w-full rounded-md border border-slate-600/80 bg-slate-900/60 py-1.5 pl-8 pr-2.5 text-[12px] text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 sm:h-7"
              />
            </div>
            <Link
              href="/notifications"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-600/90 bg-slate-800/40 px-3 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7"
            >
              <Bell className="mr-1 h-3 w-3" aria-hidden />
              Notifications
            </Link>
            <Link
              href="/schedules"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-600/90 bg-slate-800/40 px-3 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7"
            >
              <Calendar className="mr-1 h-3 w-3" aria-hidden />
              All schedules
            </Link>
            <button
              type="button"
              onClick={() => router.push(newWorkflowHref())}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-600/90 bg-slate-800/90 px-3 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7"
            >
              <Plus className="mr-1 h-3 w-3" aria-hidden />
              New workflow
            </button>
          </div>
        </header>

        <div className="workflow-scroll-light relative flex min-h-0 flex-1 flex-col overflow-auto overscroll-y-auto">
          <div className="flex min-h-full flex-1 flex-col" style={workflowCanvasSurfaceStyle()}>
            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                  <p className="text-sm text-slate-600">Loading workflows…</p>
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
                    <Layers className="h-7 w-7 text-slate-500" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {items.length === 0 ? "No workflows yet" : "No workflows match your search"}
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                    {items.length === 0
                      ? "Create a workflow to chain tools and automate steps in one place."
                      : "Try a different search term or clear the box to see everything."}
                  </p>
                  {items.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => router.push(newWorkflowHref())}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2"
                    >
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                      Create your first workflow
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((w) => {
                    const stepCount = Array.isArray(w.steps) ? w.steps.length : 0;
                    const updated = formatUpdatedAt(w.updatedAt ?? w.createdAt);
                    return (
                      <div key={w.id} className="relative rounded-xl border border-[rgba(58,71,87,0.15)] bg-white shadow-[0_8px_28px_-18px_rgba(31,42,55,0.35)] transition hover:shadow-[0_12px_32px_-16px_rgba(31,42,55,0.4)]">
                        <Link href={`/workflow/${w.id}`} className="group block text-left">
                          <div className="flex items-center gap-2 rounded-t-xl border-b border-[rgba(58,71,87,0.08)] bg-[rgba(255,255,255,0.92)] px-3 py-2.5 pr-11">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-600">
                              <FiTool className="h-3.5 w-3.5" aria-hidden />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-ink-800)]">
                              {w.name || "Untitled"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {w.schedules && w.schedules.length > 0 && (
                                <span
                                  title={`${w.schedules.length} schedule${w.schedules.length === 1 ? "" : "s"} configured`}
                                  className={`inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${w.schedules.some((s) => s.enabled)
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-50 text-slate-500"
                                    }`}
                                >
                                  <Calendar className="mr-1 h-2.5 w-2.5" aria-hidden />
                                  {w.schedules.length}
                                </span>
                              )}
                              <span className="inline-flex rounded-full border border-[rgba(58,71,87,0.12)] bg-[rgba(246,248,252,0.85)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-ink-700)]">
                                {stepCount} step{stepCount === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          <div className="rounded-b-xl border-b border-[rgba(58,71,87,0.08)] bg-[rgba(246,248,252,0.7)] px-3 py-2">
                            <p className="line-clamp-3 text-xs leading-5 text-[var(--app-ink-700)]">
                              {w.description?.trim() || "No description."}
                            </p>
                            {updated ? (
                              <p className="mt-1.5 text-[10px] font-medium text-[var(--app-ink-500)]">Updated {updated}</p>
                            ) : null}
                          </div>
                        </Link>
                        <div className="absolute right-2 top-2 z-10">
                          <button
                            type="button"
                            aria-label="Workflow actions"
                            className="rounded-md border border-[rgba(58,71,87,0.12)] bg-white/95 p-1 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuWorkflowId((current) => (current === w.id ? null : w.id));
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                          {menuWorkflowId === w.id ? (
                            <div
                              className="absolute right-0 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-[11px] shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/workflow/${w.id}`}
                                className="block px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                Open workflow
                              </Link>
                              <Link
                                href={`/workflow/${w.id}/executions`}
                                className="block px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                Executions
                              </Link>
                              <button
                                type="button"
                                disabled={deletingId === w.id}
                                className="w-full border-t border-slate-100 px-2.5 py-1.5 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(w.id, w.name);
                                }}
                              >
                                {deletingId === w.id ? "Deleting..." : "Delete"}
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
