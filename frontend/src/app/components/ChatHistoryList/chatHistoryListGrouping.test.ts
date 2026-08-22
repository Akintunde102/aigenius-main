import type { ChatSession } from "@/app/components/model-interface/shared/types";
import type { CodeProject } from "@/lib/calls/code-projects";
import { groupSidebarSessionsByProject } from "./chatHistoryListGrouping";

const projects: CodeProject[] = [
  {
    id: "proj-nobox",
    userId: "user-1",
    name: "Nobox Website",
    rootPath: "/tmp/nobox",
    rules: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function session(id: string, overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id,
    modelId: "gpt-4o",
    title: id,
    messages: [{ role: "user", content: "hi", timestamp: 1 }],
    ...overrides,
  };
}

describe("groupSidebarSessionsByProject", () => {
  it("groups the active session under activeProjectId when codeProjectId is missing", () => {
    const buckets = groupSidebarSessionsByProject(
      [session("active-1")],
      projects,
      { activeSessionId: "active-1", activeProjectId: "proj-nobox" },
    );

    const nobox = buckets.find((b) => b.projectId === "proj-nobox");
    expect(nobox).toBeDefined();
    expect(nobox?.conversationCount).toBe(1);
    expect(nobox?.hasActiveSession).toBe(true);
    expect(nobox?.sessions.map((s) => s.id)).toEqual(["active-1"]);
    expect(buckets.some((b) => b.projectId === null)).toBe(false);
  });

  it("orders project buckets by most recent conversation activity", () => {
    const extraProjects: CodeProject[] = [
      {
        id: "proj-old",
        userId: "user-1",
        name: "Older Project",
        rootPath: "/tmp/old",
        rules: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "proj-recent",
        userId: "user-1",
        name: "Recent Project",
        rootPath: "/tmp/recent",
        rules: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const buckets = groupSidebarSessionsByProject(
      [
        session("old-chat", {
          codeProjectId: "proj-old",
          messages: [{ role: "user", content: "hi", timestamp: 100 }],
        }),
        session("recent-chat", {
          codeProjectId: "proj-recent",
          messages: [{ role: "user", content: "hi", timestamp: 9_000 }],
        }),
      ],
      extraProjects,
    );

    expect(buckets.map((b) => b.projectId)).toEqual(["proj-recent", "proj-old"]);
  });

  it("ignores lastAccessed and orders by last message timestamp only", () => {
    const buckets = groupSidebarSessionsByProject(
      [
        session("visited-recently", {
          codeProjectId: "proj-nobox",
          messages: [{ role: "user", content: "hi", timestamp: 100 }],
          metadata: { lastAccessed: "2026-08-01T12:00:00.000Z" },
        }),
        session("messaged-recently", {
          codeProjectId: "proj-other",
          messages: [{ role: "user", content: "hi", timestamp: 5_000 }],
        }),
      ],
      [
        ...projects,
        {
          id: "proj-other",
          userId: "user-1",
          name: "Other Project",
          rootPath: "/tmp/other",
          rules: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    expect(buckets[0]?.projectId).toBe("proj-other");
  });

  it("keeps persisted codeProjectId and sorts conversations by recency", () => {
    const buckets = groupSidebarSessionsByProject(
      [
        session("active-1", {
          codeProjectId: "proj-nobox",
          messages: [{ role: "user", content: "hi", timestamp: 2_000 }],
        }),
        session("older-1", {
          codeProjectId: "proj-nobox",
          messages: [{ role: "user", content: "hi", timestamp: 1_000 }],
        }),
      ],
      projects,
      { activeSessionId: "active-1", activeProjectId: "proj-nobox" },
    );

    const nobox = buckets.find((b) => b.projectId === "proj-nobox");
    expect(nobox?.conversationCount).toBe(2);
    expect(nobox?.sessions.map((s) => s.id)).toEqual(["active-1", "older-1"]);
  });

  it("pins the active project bucket to the top even when another project is more recent", () => {
    const extraProjects: CodeProject[] = [
      {
        id: "proj-active",
        userId: "user-1",
        name: "Active Project",
        rootPath: "/tmp/active",
        rules: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "proj-hotter",
        userId: "user-1",
        name: "Hotter Project",
        rootPath: "/tmp/hotter",
        rules: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const buckets = groupSidebarSessionsByProject(
      [
        session("active-chat", {
          codeProjectId: "proj-active",
          messages: [{ role: "user", content: "hi", timestamp: 100 }],
        }),
        session("hot-chat", {
          codeProjectId: "proj-hotter",
          messages: [{ role: "user", content: "hi", timestamp: 9_000 }],
        }),
      ],
      extraProjects,
      { activeSessionId: "active-chat", activeProjectId: "proj-active" },
    );

    expect(buckets[0]?.projectId).toBe("proj-active");
    expect(buckets[1]?.projectId).toBe("proj-hotter");
  });

  it("pins the active General bucket to the top when it has the open chat", () => {
    const buckets = groupSidebarSessionsByProject(
      [
        session("general-active", {
          messages: [{ role: "user", content: "hi", timestamp: 100 }],
        }),
        session("project-chat", {
          codeProjectId: "proj-nobox",
          messages: [{ role: "user", content: "hi", timestamp: 9_000 }],
        }),
      ],
      projects,
      { activeSessionId: "general-active", activeProjectId: null },
    );

    expect(buckets[0]?.projectId).toBeNull();
    expect(buckets[0]?.hasActiveSession).toBe(true);
  });
});
