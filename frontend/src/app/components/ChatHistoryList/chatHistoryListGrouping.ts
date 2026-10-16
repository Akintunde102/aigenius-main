import type { ChatSession } from "@/app/components/model-interface/shared/types";
import type { CodeProject } from "@/lib/calls/code-projects";
import { resolveSessionLastMessageTimestamp } from "@/app/components/model-interface/conversation/sessionRecency";

function lastMessageTimestamp(session: ChatSession): number {
  return resolveSessionLastMessageTimestamp(session);
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

import type { ConversationLabel } from "@/lib/calls/model-chat-conversation";

export type LabelFolderBucket = {
  labelId: string;
  name: string;
  color: string;
  sessions: ChatSession[];
};

export type ProjectSidebarBucket = {
  projectId: string | null;
  label: string;
  /** Root filesystem path of the project (desktop only). */
  rootPath?: string | null;
  /** Flat list sorted by recency (no nested section headers). */
  sessions: ChatSession[];
  /** Populated when sidebarOrganization === 'labels' */
  folders?: LabelFolderBucket[];
  /** Populated when sidebarOrganization === 'labels': sessions with 0 labels */
  others?: ChatSession[];
  /** Includes the open-now chat when it belongs to this project. Distinct count of unique sessions. */
  conversationCount: number;
  /** True when the pinned open-now chat is assigned to this project. */
  hasActiveSession: boolean;
};

export type GroupSidebarSessionsByProjectOptions = {
  /** Session shown in the Open now section — excluded from bucket rows. */
  activeSessionId?: string | null;
  /** Fallback project for the active session when codeProjectId is not persisted yet. */
  activeProjectId?: string | null;
  /** Sidebar presentation mode */
  sidebarOrganization?: 'flat' | 'labels';
  /** Global user conversation labels catalog */
  conversationLabels?: ConversationLabel[];
};

function resolveSessionProjectId(
  session: ChatSession,
  opts: GroupSidebarSessionsByProjectOptions,
): string | null {
  if (session.codeProjectId) return session.codeProjectId;
  const sessionId = session.id ?? "";
  if (
    opts.activeSessionId
    && sessionId === opts.activeSessionId
    && opts.activeProjectId
  ) {
    return opts.activeProjectId;
  }
  return null;
}

/**
 * Partition sessions in a project bucket into colored label folders and unlabeled ("Others").
 * Empty folders are excluded.
 */
export function groupProjectBucketByLabels(
  sessions: ChatSession[],
  catalog: ConversationLabel[] = [],
): { folders: LabelFolderBucket[]; others: ChatSession[] } {
  const folderBuckets = new Map<string, ChatSession[]>();
  for (const label of catalog) {
    folderBuckets.set(label.id, []);
  }

  const others: ChatSession[] = [];

  for (const session of sessions) {
    const ids = session.labelIds ?? [];
    if (!ids.length) {
      others.push(session);
      continue;
    }

    let assignedToAny = false;
    for (const labelId of ids) {
      const bucket = folderBuckets.get(labelId);
      if (bucket) {
        bucket.push(session);
        assignedToAny = true;
      }
    }

    if (!assignedToAny) {
      others.push(session);
    }
  }

  const folders: LabelFolderBucket[] = [];
  for (const label of catalog) {
    const folderSessions = folderBuckets.get(label.id);
    if (folderSessions && folderSessions.length > 0) {
      folders.push({
        labelId: label.id,
        name: label.name,
        color: label.color,
        sessions: sortSidebarSessions(folderSessions),
      });
    }
  }

  return {
    folders,
    others: sortSidebarSessions(others),
  };
}

/** Most recently messaged first (last sent or received message). */
export function sortSidebarSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort(
    (a, b) => lastMessageTimestamp(b) - lastMessageTimestamp(a),
  );
}

/**
 * Group sessions under project headers. General only appears when unassigned chats exist.
 *
 * Project conversations stay inline within their project bucket (highlighted when active).
 * Only general (non-project) conversations are extracted to "Open Now".
 */
export function groupSidebarSessionsByProject(
  sessions: ChatSession[],
  projects: CodeProject[],
  opts: GroupSidebarSessionsByProjectOptions = {},
): ProjectSidebarBucket[] {
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const byProject = new Map<string | null, ChatSession[]>();
  const activeSessionId = opts.activeSessionId ?? null;

  for (const s of sessions) {
    const pid = resolveSessionProjectId(s, opts);
    const list = byProject.get(pid) ?? [];
    list.push(s);
    byProject.set(pid, list);
  }

  const toBucket = (
    projectId: string | null,
    label: string,
    list: ChatSession[],
  ): ProjectSidebarBucket => {
    const hasActiveSession = Boolean(
      activeSessionId && list.some((s) => s.id === activeSessionId),
    );

    const sessionsForList = list;
    const bucket: ProjectSidebarBucket = {
      projectId,
      label,
      sessions: sortSidebarSessions(sessionsForList),
      conversationCount: list.length,
      hasActiveSession,
    };

    if (opts.sidebarOrganization === "labels") {
      const { folders, others } = groupProjectBucketByLabels(
        sessionsForList,
        opts.conversationLabels ?? [],
      );
      bucket.folders = folders;
      bucket.others = others;
    }

    return bucket;
  };

  const buckets: ProjectSidebarBucket[] = [];

  for (const project of projects) {
    const list = byProject.get(project.id) ?? [];
    const bucket = toBucket(project.id, project.name, list);
    bucket.rootPath = project.rootPath ?? null;
    buckets.push(bucket);
    byProject.delete(project.id);
  }

  const general = byProject.get(null) ?? [];
  if (general.length > 0) {
    buckets.push(toBucket(null, "General", general));
    byProject.delete(null);
  }

  byProject.forEach((list, projectId) => {
    if (!list.length) return;
    buckets.push(
      toBucket(
        projectId,
        projectNameById.get(projectId ?? '') ?? "Unknown project",
        list,
      ),
    );
  });

  return orderSidebarBuckets(buckets);
}

/** Project folders stay above General; each group is sorted by latest activity. */
function orderSidebarBuckets(
  buckets: ProjectSidebarBucket[],
): ProjectSidebarBucket[] {
  const projectBuckets = buckets.filter((bucket) => bucket.projectId !== null);
  const generalBuckets = buckets.filter((bucket) => bucket.projectId === null);
  return [
    ...sortBucketsByLastMessage(projectBuckets),
    ...generalBuckets,
  ];
}

function bucketLastMessageAt(bucket: ProjectSidebarBucket): number {
  return bucket.sessions.reduce(
    (max, session) => Math.max(max, lastMessageTimestamp(session)),
    0,
  );
}

/** Order project sections by the latest message across their conversations. */
function sortBucketsByLastMessage(
  buckets: ProjectSidebarBucket[],
): ProjectSidebarBucket[] {
  return [...buckets].sort(
    (a, b) => bucketLastMessageAt(b) - bucketLastMessageAt(a),
  );
}

