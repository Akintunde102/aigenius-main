import axios from "axios";
import { authHttp, authorizedFetch } from "@/lib/api/auth-client";
import {
  cancelWorkflowRun,
  deleteWorkflow,
  deleteWorkflowRun,
  deleteWorkflowRuns,
  extractWorkflowApiServerMessage,
  scheduleWorkflow,
  streamWorkflowRunEvents,
} from "./workflowsApi";
import { getEmptyScheduleDraft, type WorkflowScheduleDraft } from "./workflowsUtils";

jest.mock("@/lib/api/auth-client", () => ({
  __esModule: true,
  authHttp: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  authorizedFetch: jest.fn(),
}));

describe("workflowsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(axios, {
      isAxiosError: (value: unknown) => Boolean((value as { response?: unknown })?.response),
      isCancel: (value: unknown) => false,
    });
    (authHttp.post as jest.Mock).mockResolvedValue({ data: { ok: true } });
  });

  function createSseResponse(lines: string[]) {
    const encoder = new TextEncoder();
    let index = 0;
    return {
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn().mockImplementation(async () => {
            if (index >= lines.length) {
              return { done: true, value: undefined };
            }
            const value = encoder.encode(lines[index]);
            index += 1;
            return { done: false, value };
          }),
          releaseLock: jest.fn(),
        }),
      },
    } as unknown as Response;
  }

  it("sends an ISO timestamp for one-time schedules", async () => {
    const draft: WorkflowScheduleDraft = {
      ...getEmptyScheduleDraft(),
      id: "schedule-1",
      name: "Morning run",
      enabled: true,
      mode: "once",
      scheduledAt: "2026-04-05T09:30",
      timezone: "UTC",
    };

    await scheduleWorkflow("wf-1", draft);

    expect(authHttp.post).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1/schedule"),
      {
        id: "schedule-1",
        name: "Morning run",
        enabled: true,
        ruleType: "once",
        expression: new Date("2026-04-05T09:30").toISOString(),
        timezone: "UTC",
      },
      expect.any(Object),
    );
  });

  it("extracts nested Nest 401 message bodies (AllExceptionsFilter shape)", () => {
    const msg = extractWorkflowApiServerMessage({
      statusCode: 401,
      message: {
        error: ["Authorization error"],
        message: "Authentication required",
      },
    });
    expect(msg).toBe("Authentication required");
  });

  it("posts to the cancel-run endpoint", async () => {
    await cancelWorkflowRun("wf-1", "run-1");

    expect(authHttp.post).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1/runs/run-1/cancel"),
      {},
      expect.any(Object),
    );
  });

  it("deletes a single workflow run", async () => {
    (authHttp.delete as jest.Mock).mockResolvedValue({});

    await deleteWorkflowRun("wf-1", "run-1");

    expect(authHttp.delete).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1/runs/run-1"),
      expect.any(Object),
    );
  });
 
  it("deletes a workflow", async () => {
    (authHttp.delete as jest.Mock).mockResolvedValue({});

    await deleteWorkflow("wf-1");

    expect(authHttp.delete).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1"),
      expect.any(Object),
    );
  });

  it("posts bulk workflow run deletions", async () => {
    (authHttp.post as jest.Mock).mockResolvedValue({ data: { deleted: 2 } });

    await expect(deleteWorkflowRuns("wf-1", ["run-1", "run-2"])).resolves.toBe(2);

    expect(authHttp.post).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1/runs/delete"),
      { runIds: ["run-1", "run-2"] },
      expect.any(Object),
    );
  });

  it("stops the SSE reader when a run_cancelled event arrives", async () => {
    const onEvent = jest.fn();
    (authorizedFetch as jest.Mock).mockResolvedValue(
      createSseResponse(['data: {"type":"run_cancelled","runId":"run-1"}\n']),
    );

    await streamWorkflowRunEvents("wf-1", "run-1", onEvent);

    expect(onEvent).toHaveBeenCalledWith({ type: "run_cancelled", runId: "run-1" });
  });

  it("maps cancel-run API errors to a workflow API error", async () => {
    (authHttp.post as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: "Run is not currently running." } },
    });

    await expect(cancelWorkflowRun("wf-1", "run-1")).rejects.toMatchObject({
      message: "Run is not currently running.",
      operation: "cancelWorkflowRun",
      statusCode: 400,
    });
  });

  it("builds cron payloads for repeat schedules", async () => {
    const draft: WorkflowScheduleDraft = {
      ...getEmptyScheduleDraft(),
      id: "schedule-2",
      name: "Weekday run",
      enabled: true,
      mode: "repeat",
      repeatPreset: "weekdays",
      repeatTime: "08:15",
      timezone: "UTC",
    };

    await scheduleWorkflow("wf-1", draft);

    expect(authHttp.post).toHaveBeenCalledWith(
      expect.stringContaining("/workflows/wf-1/schedule"),
      {
        id: "schedule-2",
        name: "Weekday run",
        enabled: true,
        ruleType: "cron",
        expression: "15 8 * * 1-5",
        timezone: "UTC",
      },
      expect.any(Object),
    );
  });
});
