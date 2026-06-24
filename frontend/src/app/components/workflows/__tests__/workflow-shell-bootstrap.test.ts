import { authHttp } from "@/lib/api/auth-client";
import {
  beginNewWorkflowShell,
  resetWorkflowShellBootstrap,
} from "../workflowsApi";

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

describe("workflow shell bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    resetWorkflowShellBootstrap();
    (authHttp.post as jest.Mock).mockResolvedValue({
      data: {
        id: "wf-created",
        name: "Untitled workflow",
        steps: [],
        schedules: [],
      },
    });
  });

  it("creates a new shell when navigation token changes", async () => {
    await beginNewWorkflowShell("nav-1");
    expect(authHttp.post).toHaveBeenCalledTimes(1);

    await beginNewWorkflowShell("nav-2");
    expect(authHttp.post).toHaveBeenCalledTimes(2);
  });

  it("reuses cached shell for the same navigation token (Strict Mode remount)", async () => {
    const first = await beginNewWorkflowShell("nav-1");
    expect(first.id).toBe("wf-created");
    expect(authHttp.post).toHaveBeenCalledTimes(1);

    const remount = await beginNewWorkflowShell("nav-1");
    expect(remount.id).toBe("wf-created");
    expect(authHttp.post).toHaveBeenCalledTimes(1);
  });
});
