import type { ChatSession } from "@/app/components/model-interface/shared/types";
import type { CodeProject } from "@/lib/calls/code-projects";
import { groupSidebarSessionsByProject } from "./chatHistoryListGrouping";

const projects: CodeProject[] = [
  {
    id: "proj-nobox",
    name: "Nobox Website",
    rootPath: "/tmp/nobox",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function session(id: string, overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id,
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
    expect(nobox?.sessions).toHaveLength(0);
    expect(buckets.some((b) => b.projectId === null)).toBe(false);
  });

  it("keeps persisted codeProjectId and excludes the active row from bucket lists", () => {
    const buckets = groupSidebarSessionsByProject(
      [
        session("active-1", { codeProjectId: "proj-nobox" }),
        session("older-1", { codeProjectId: "proj-nobox" }),
      ],
      projects,
      { activeSessionId: "active-1", activeProjectId: "proj-nobox" },
    );

    const nobox = buckets.find((b) => b.projectId === "proj-nobox");
    expect(nobox?.conversationCount).toBe(2);
    expect(nobox?.sessions.map((s) => s.id)).toEqual(["older-1"]);
  });
});
