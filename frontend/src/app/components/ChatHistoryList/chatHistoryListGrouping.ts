import type { ChatSession } from "@/app/components/model-interface/shared/types";
import type { CodeProject } from "@/lib/calls/code-projects";

function lastMessageTimestamp(session: ChatSession): number {
  const msgs = session.messages;
  if (!msgs?.length) return 0;
  const last = msgs[msgs.length - 1];
  return typeof last?.timestamp === "number" ? last.timestamp : 0;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type GroupedSidebarSessions = {
  starred: ChatSession[];
  recent: ChatSession[];
  earlier: ChatSession[];
};

/**
 * Partition non-active sessions for sidebar section headers (starred / recent / earlier).
 */
export function groupSidebarSessions(
  sessions: ChatSession[],
  nowMs: number = Date.now(),
): GroupedSidebarSessions {
  const starred: ChatSession[] = [];
  const recent: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const s of sessions) {
    if (s.starred) {
      starred.push(s);
      continue;
    }
    const t = lastMessageTimestamp(s);
    if (t > 0 && nowMs - t < SEVEN_DAYS_MS) {
      recent.push(s);
    } else {
      earlier.push(s);
    }
  }

  const byRecent = (a: ChatSession, b: ChatSession) =>
    lastMessageTimestamp(b) - lastMessageTimestamp(a);

  starred.sort(byRecent);
  recent.sort(byRecent);
  earlier.sort(byRecent);

  return { starred, recent, earlier };
}

export type ProjectSidebarBucket = {
  projectId: string | null;
  label: string;
  sessions: GroupedSidebarSessions;
};

/**
 * Group sessions under project headers, then starred/recent/earlier within each.
 */
export function groupSidebarSessionsByProject(
  sessions: ChatSession[],
  projects: CodeProject[],
  nowMs: number = Date.now(),
): ProjectSidebarBucket[] {
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const byProject = new Map<string | null, ChatSession[]>();

  for (const s of sessions) {
    const pid = s.codeProjectId ?? null;
    const list = byProject.get(pid) ?? [];
    list.push(s);
    byProject.set(pid, list);
  }

  const buckets: ProjectSidebarBucket[] = [];

  for (const project of projects) {
    const list = byProject.get(project.id);
    if (!list?.length) continue;
    buckets.push({
      projectId: project.id,
      label: project.name,
      sessions: groupSidebarSessions(list, nowMs),
    });
    byProject.delete(project.id);
  }

  const general = byProject.get(null);
  if (general?.length) {
    buckets.push({
      projectId: null,
      label: "General",
      sessions: groupSidebarSessions(general, nowMs),
    });
    byProject.delete(null);
  }

  for (const [projectId, list] of byProject.entries()) {
    if (!list.length) continue;
    buckets.push({
      projectId,
      label: projectNameById.get(projectId ?? '') ?? "Unknown project",
      sessions: groupSidebarSessions(list, nowMs),
    });
  }

  return buckets;
}
