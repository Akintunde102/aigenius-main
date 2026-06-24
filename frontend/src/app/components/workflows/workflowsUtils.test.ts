import {
  buildCronExpression,
  computeInsertCanvasPosition,
  createLastResultToken,
  createResultToken,
  detectUserTimezone,
  formatWorkflowDraftForApi,
  formatWorkflowBilledUsd,
  getEmptyScheduleDraft,
  getEmptyWorkflowDraft,
  hydrateDraftFromWorkflow,
  mergeSavedWorkflowIntoDraft,
  listBindablePaths,
  normalizeWorkflowFieldValueForSchema,
  normalizeWorkflowStepExecutionInfo,
  formatWorkflowWalletBalance,
  parseWorkflowMetaSelectChange,
  parseWorkflowSseDataLine,
  parseWorkflowSseEventPayload,
  resolveStepCanvasCoords,
  scanArgsForLastToken,
  shouldAnimateConnectorPipeFlow,
  summarizeWorkflowStepArgsForDisplay,
  formatWorkflowToolOutputForDisplay,
  tryInvokeCodeFromToolResultJson,
  truncateWorkflowRunOutput,
  validateWorkflowDraft,
  validateWorkflowDraftForRemotePersist,
  workflowStepRunStatusLabel,
  DEFAULT_WORKFLOW_NAME,
  ensureUniqueStepId,
  WORKFLOW_CANVAS_ORIGIN,
  WORKFLOW_CANVAS_STEP_SPACING_X,
  type ToolSchema,
  type WorkflowDraft,
} from "./workflowsUtils";

describe("workflowsUtils", () => {
  it("workflowStepRunStatusLabel maps run statuses", () => {
    expect(workflowStepRunStatusLabel("pending")).toBe("Pending");
    expect(workflowStepRunStatusLabel("running")).toBe("Running");
    expect(workflowStepRunStatusLabel("completed")).toBe("Completed");
    expect(workflowStepRunStatusLabel("failed")).toBe("Failed");
    expect(workflowStepRunStatusLabel("skipped")).toBe("Skipped");
  });

  const pending = { status: "pending" as const, result: null, error: null };
  const running = { status: "running" as const, result: null, error: null };
  const completed = { status: "completed" as const, result: "ok", error: null };
  const failed = { status: "failed" as const, result: null, error: "x" };
  const skipped = { status: "skipped" as const, result: null, error: null };

  it("shouldAnimateConnectorPipeFlow is true only after upstream completed and downstream is still pending", () => {
    expect(shouldAnimateConnectorPipeFlow("idle", completed, pending)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", completed, pending)).toBe(true);
    expect(shouldAnimateConnectorPipeFlow("running", running, pending)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", completed, running)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", completed, completed)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", pending, pending)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", running, undefined)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", failed, pending)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", skipped, pending)).toBe(false);
    expect(shouldAnimateConnectorPipeFlow("running", completed, failed)).toBe(false);
  });

  it("parses workflow run SSE JSON payloads", () => {
    const ev = parseWorkflowSseEventPayload(
      '{"type":"step_started","runId":"r1","stepId":"s1","stepIndex":0,"toolName":"web_fetch"}',
    );
    expect(ev?.type).toBe("step_started");
    expect(ev?.runId).toBe("r1");
    expect(ev?.stepId).toBe("s1");
  });

  it("parses SSE data lines and ignores comments", () => {
    expect(parseWorkflowSseDataLine('data: {"type":"run_completed","runId":"x"}')?.type).toBe("run_completed");
    expect(parseWorkflowSseDataLine('data: {"type":"run_cancelled","runId":"x"}')?.type).toBe("run_cancelled");
    expect(parseWorkflowSseDataLine(": ping")).toBeNull();
    expect(parseWorkflowSseDataLine("event: message")).toBeNull();
  });

  it("extracts invoke code from tool result JSON when present", () => {
    expect(
      tryInvokeCodeFromToolResultJson(
        JSON.stringify({ code: "invokeTool::blockedInsufficientFunds", insufficient_funds: true }),
      ),
    ).toBe("invokeTool::blockedInsufficientFunds");
    expect(tryInvokeCodeFromToolResultJson('{"ok":true}')).toBeUndefined();
    expect(tryInvokeCodeFromToolResultJson(null)).toBeUndefined();
    expect(tryInvokeCodeFromToolResultJson("not json")).toBeUndefined();
  });

  it("normalizes blocked invoke codes into failed step executions", () => {
    expect(
      normalizeWorkflowStepExecutionInfo({
        status: "completed",
        result: JSON.stringify({
          code: "invokeTool::blockedInsufficientFunds",
          error: "Insufficient wallet balance to run this tool.",
          insufficient_funds: true,
        }),
        error: null,
        invokeCode: "invokeTool::blockedInsufficientFunds",
        billedUsd: "0" as unknown as number,
        walletAfter: "42.75" as unknown as number,
      }),
    ).toEqual({
      status: "failed",
      result: JSON.stringify({
        code: "invokeTool::blockedInsufficientFunds",
        error: "Insufficient wallet balance to run this tool.",
        insufficient_funds: true,
      }),
      error: "Insufficient wallet balance to run this tool.",
      invokeCode: "invokeTool::blockedInsufficientFunds",
      billedUsd: 0,
      walletAfter: 42.75,
    });
  });

  it("formats workflow billed usd and wallet balance for display", () => {
    expect(formatWorkflowBilledUsd(0)).toBe("$0.00");
    expect(formatWorkflowBilledUsd(0.0042)).toBe("$0.0042");
    expect(formatWorkflowBilledUsd(1.5)).toBe("$1.50");
    expect(formatWorkflowBilledUsd(null)).toBeNull();

    expect(formatWorkflowWalletBalance(42.7)).toBe("42.70");
    expect(formatWorkflowWalletBalance(1000)).toBe("1,000.00");
    expect(formatWorkflowWalletBalance(undefined)).toBeNull();
  });

  it("pretty-prints JSON tool output for display and leaves plain text unchanged", () => {
    expect(formatWorkflowToolOutputForDisplay('{"a":1,"b":[2,3]}')).toBe(
      JSON.stringify({ a: 1, b: [2, 3] }, null, 2),
    );
    expect(formatWorkflowToolOutputForDisplay("  {\"x\":true}  ")).toContain("\n");
    expect(formatWorkflowToolOutputForDisplay("not json")).toBe("not json");
    expect(formatWorkflowToolOutputForDisplay("")).toBe("");
  });

  it("truncates long workflow run output for preview", () => {
    const short = truncateWorkflowRunOutput("hello");
    expect(short.truncated).toBe(false);
    expect(short.preview).toBe("hello");
    const long = "x".repeat(500);
    const cut = truncateWorkflowRunOutput(long, 20);
    expect(cut.truncated).toBe(true);
    expect(cut.preview.length).toBeLessThanOrEqual(22);
    expect(cut.preview.endsWith("…")).toBe(true);
  });

  it("summarizes step args for canvas cards with schema order and tokens", () => {
    const schema: ToolSchema = {
      type: "object",
      properties: {
        model_id: { type: "string", title: "Model" },
        messages: { type: "array", title: "Messages" },
        temperature: { type: "number", title: "Temperature" },
      },
    };
    const args = {
      model_id: "gpt-4",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.5,
    };
    const lines = summarizeWorkflowStepArgsForDisplay(args, schema, () => undefined);
    expect(lines.map((l) => l.label)).toEqual(["Model", "Messages", "Temperature"]);
    expect(lines[0]?.value).toContain("gpt-4");
    expect(lines[1]?.value).toContain("1 item");
    expect(lines[2]?.value).toBe("0.5");

    const tokenLines = summarizeWorkflowStepArgsForDisplay(
      { prompt: "{{steps.find-facts.result}}" },
      { type: "object", properties: { prompt: { type: "string", title: "Prompt" } } },
      (id) => (id === "find-facts" ? "Find facts" : undefined),
    );
    expect(tokenLines[0]?.value).toContain("←");
    expect(tokenLines[0]?.value).toContain("Find facts");

    const lastLines = summarizeWorkflowStepArgsForDisplay(
      { prompt: createLastResultToken() },
      { type: "object", properties: { prompt: { type: "string", title: "Prompt" } } },
      () => undefined,
    );
    expect(lastLines[0]?.value).toBe("← Previous step");
  });

  it("detects {{ last }} in nested args", () => {
    expect(scanArgsForLastToken({ x: { y: "{{  LAST }}" } })).toBe(true);
    expect(scanArgsForLastToken({ x: "plain" })).toBe(false);
  });

  it("rejects {{ last }} on the first step in draft validation", () => {
    const bad: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "N",
      steps: [
        {
          localId: "1",
          label: "Only",
          stepId: "only",
          toolName: "web_fetch",
          args: { url: createLastResultToken() },
          resultLink: null,
        },
      ],
    };
    expect(validateWorkflowDraft(bad).isValid).toBe(false);
    expect(validateWorkflowDraft(bad).issues.some((i) => i.includes("{{ last }}"))).toBe(true);
    expect(validateWorkflowDraftForRemotePersist(bad).isValid).toBe(false);
  });

  it("keeps {{ last }} as an execution-time token without adding graph metadata", () => {
    const draft: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "Chain",
      steps: [
        {
          localId: "1",
          label: "A",
          stepId: "step-a",
          toolName: "web_fetch",
          args: { url: "https://a.com" },
          resultLink: null,
        },
        {
          localId: "2",
          label: "B",
          stepId: "step-b",
          toolName: "call_model",
          args: { prompt: `Prefix ${createLastResultToken()} suffix` },
          resultLink: null,
        },
      ],
    };
    const payload = formatWorkflowDraftForApi(draft);
    expect(payload.steps[1]).toEqual({
      stepId: "step-b",
      toolName: "call_model",
      label: "B",
      args: { prompt: `Prefix ${createLastResultToken()} suffix` },
      canvasX: undefined,
      canvasY: undefined,
    });
  });

  it("keeps nested steps.*.result tokens without adding graph metadata", () => {
    const draft: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "Nested",
      steps: [
        {
          localId: "1",
          label: "A",
          stepId: "step-a",
          toolName: "call_model",
          args: { prompt: "hi" },
          resultLink: null,
        },
        {
          localId: "2",
          label: "B",
          stepId: "step-b",
          toolName: "call_model",
          args: { prompt: "{{steps.step-a.result.subject}}" },
          resultLink: null,
        },
      ],
    };
    const payload = formatWorkflowDraftForApi(draft);
    expect(payload.steps[1]).toEqual({
      stepId: "step-b",
      toolName: "call_model",
      label: "B",
      args: { prompt: "{{steps.step-a.result.subject}}" },
      canvasX: undefined,
      canvasY: undefined,
    });
  });

  it("rejects {{ last.path }} on the first step in draft validation", () => {
    const bad: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "N",
      steps: [
        {
          localId: "1",
          label: "Only",
          stepId: "only",
          toolName: "web_fetch",
          args: { url: "{{ last.subject }}" },
          resultLink: null,
        },
      ],
    };
    expect(validateWorkflowDraft(bad).isValid).toBe(false);
    expect(validateWorkflowDraft(bad).issues.some((i) => i.includes("{{ last }}"))).toBe(true);
  });

  it("makes duplicate step ids unique", () => {
    expect(ensureUniqueStepId("Look things up", ["look-things-up"])).toBe("look-things-up-2");
  });

  it("allows empty steps for remote persist and defaults API name", () => {
    const empty: WorkflowDraft = { ...getEmptyWorkflowDraft(), name: "" };
    expect(validateWorkflowDraftForRemotePersist(empty).isValid).toBe(true);
    expect(formatWorkflowDraftForApi(empty).name).toBe(DEFAULT_WORKFLOW_NAME);
  });

  it("formats workflow payloads with result tokens only", () => {
    const draft: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "Homework helper",
      steps: [
        {
          localId: "1",
          label: "Find facts",
          stepId: "find-facts",
          toolName: "web_fetch",
          args: { url: "https://example.com" },
          resultLink: null,
        },
        {
          localId: "2",
          label: "Explain simply",
          stepId: "explain-simply",
          toolName: "call_model",
          args: { prompt: "" },
          resultLink: {
            sourceStepId: "find-facts",
            targetPath: "prompt",
          },
        },
      ],
    };

    expect(formatWorkflowDraftForApi(draft)).toEqual({
      name: "Homework helper",
      description: undefined,
      isPublic: false,
      steps: [
        {
          stepId: "find-facts",
          toolName: "web_fetch",
          label: "Find facts",
          args: { url: "https://example.com" },
          canvasX: undefined,
          canvasY: undefined,
        },
        {
          stepId: "explain-simply",
          toolName: "call_model",
          label: "Explain simply",
          args: { prompt: createResultToken("find-facts") },
          canvasX: undefined,
          canvasY: undefined,
        },
      ],
      schedules: [],
    });
  });

  it("validates duplicate ids and missing schedule details", () => {
    const invalidDraft: WorkflowDraft = {
      ...getEmptyWorkflowDraft(),
      name: "Morning helper",
      steps: [
        {
          localId: "1",
          label: "First",
          stepId: "same-step",
          toolName: "web_fetch",
          args: {},
          resultLink: null,
        },
        {
          localId: "2",
          label: "Second",
          stepId: "same-step",
          toolName: "call_model",
          args: {},
          resultLink: null,
        },
      ],
      schedules: [
        {
          ...getEmptyScheduleDraft(),
          name: "Broken schedule",
          enabled: true,
          mode: "repeat",
          repeatPreset: "custom",
          customCron: "",
        },
      ],
    };

    const result = validateWorkflowDraft(invalidDraft);

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Step IDs must be unique. "same-step" is repeated.');
    expect(result.issues).toContain("Add a custom repeat rule or choose a simpler repeat option.");
  });

  it("creates stable generated schedule names and uses the browser timezone by default", () => {
    const originalIntl = global.Intl;
    Object.defineProperty(global, "Intl", {
      configurable: true,
      value: {
        ...originalIntl,
        DateTimeFormat: jest.fn(() => ({
          resolvedOptions: () => ({ timeZone: "Africa/Lagos" }),
        })),
      },
    });

    const first = getEmptyScheduleDraft();
    const second = getEmptyScheduleDraft([first]);

    expect(detectUserTimezone()).toBe("Africa/Lagos");
    expect(first.name).toBe("Schedule 1");
    expect(second.name).toBe("Schedule 2");
    expect(first.timezone).toBe("Africa/Lagos");

    Object.defineProperty(global, "Intl", { configurable: true, value: originalIntl });
  });

  it("includes schedule audit metadata in workflow payloads", () => {
    const payload = formatWorkflowDraftForApi({
      ...getEmptyWorkflowDraft(),
      name: "With schedule metadata",
      schedules: [
        {
          ...getEmptyScheduleDraft(),
          id: "schedule-1",
          createdAt: "2026-04-07T10:00:00.000Z",
          updatedAt: "2026-04-07T11:00:00.000Z",
        },
      ],
    });

    expect(payload.schedules[0]).toEqual(expect.objectContaining({
      createdAt: "2026-04-07T10:00:00.000Z",
      updatedAt: "2026-04-07T11:00:00.000Z",
    }));
  });

  it("builds cron expressions from friendly repeat presets", () => {
    expect(
      buildCronExpression({
        id: "s1",
        name: "Daily run",
        enabled: true,
        mode: "repeat",
        scheduledAt: "",
        repeatPreset: "daily",
        repeatInterval: "1",
        repeatUnit: "minutes",
        repeatTime: "09:30",
        repeatWeekday: "1",
        customCron: "",
        timezone: "UTC",
      }),
    ).toBe("30 9 * * *");

    expect(
      buildCronExpression({
        id: "s2",
        name: "Weekly run",
        enabled: true,
        mode: "repeat",
        scheduledAt: "",
        repeatPreset: "weekly",
        repeatInterval: "1",
        repeatUnit: "minutes",
        repeatTime: "07:05",
        repeatWeekday: "4",
        customCron: "",
        timezone: "UTC",
      }),
    ).toBe("5 7 * * 4");
  });

  it("hydrates saved workflows and infers one result link from args", () => {
    const draft = hydrateDraftFromWorkflow({
      id: "wf-1",
      name: "Saved helper",
      description: "desc",
      isPublic: true,
      schedules: [
        {
          id: "schedule-1",
          name: "Morning",
          enabled: true,
          ruleType: "once",
          expression: "2026-04-05T09:30:00.000Z",
          timezone: "UTC",
        },
      ],
      steps: [
        {
          stepId: "find-facts",
          toolName: "web_fetch",
          args: { url: "https://example.com" },
        },
        {
          stepId: "explain-simply",
          toolName: "call_model",
          args: { prompt: createResultToken("find-facts") },
        },
      ],
    });

    expect(draft.workflowId).toBe("wf-1");
    expect(draft.schedules).toHaveLength(1);
    expect(draft.steps[1].resultLink).toEqual({
      sourceStepId: "find-facts",
      targetPath: "prompt",
    });
  });

  it("merges saved workflow metadata without regenerating local draft identities", () => {
    const current = {
      workflowId: "wf-1",
      name: "Draft name",
      description: "Draft description",
      isPublic: false,
      steps: [
        {
          localId: "local-step-1",
          label: "Fetch page",
          stepId: "fetch-page",
          toolName: "web_fetch",
          args: { url: "https://example.com" },
          resultLink: null,
          canvasX: 10,
          canvasY: 20,
        },
      ],
      schedules: [
        {
          ...getEmptyScheduleDraft(),
          id: "schedule-1",
          name: "Schedule 1",
        },
      ],
    };

    const merged = mergeSavedWorkflowIntoDraft(current, {
      id: "wf-1",
      name: "Draft name",
      description: "Draft description",
      isPublic: false,
      steps: [
        {
          stepId: "fetch-page",
          toolName: "web_fetch",
          label: "Fetch page",
          args: { url: "https://example.com" },
          canvasX: 10,
          canvasY: 20,
        },
      ],
      schedules: [
        {
          id: "schedule-1",
          name: "Schedule 1",
          enabled: false,
          ruleType: "once",
          expression: "2026-04-07T17:30:00.000Z",
          timezone: "Africa/Lagos",
          createdAt: "2026-04-07T17:00:00.000Z",
          updatedAt: "2026-04-07T17:05:00.000Z",
        },
      ],
    });

    expect(merged.steps[0]?.localId).toBe("local-step-1");
    expect(merged.schedules[0]?.id).toBe("schedule-1");
    expect(merged.schedules[0]?.name).toBe("Schedule 1");
    expect(merged.schedules[0]?.createdAt).toBe("2026-04-07T17:00:00.000Z");
    expect(merged.schedules[0]?.updatedAt).toBe("2026-04-07T17:05:00.000Z");
    expect(merged.schedules[0]?.scheduledAt).toBe(current.schedules[0]?.scheduledAt);
  });

  it("lists bindable text paths from nested schemas", () => {
    expect(
      listBindablePaths({
        type: "object",
        properties: {
          prompt: { type: "string", title: "Prompt" },
          options: {
            type: "object",
            properties: {
              audience: { type: "string", title: "Audience" },
              retries: { type: "integer", title: "Retries" },
            },
          },
        },
      }),
    ).toEqual([
      { path: "prompt", label: "Prompt" },
      { path: "options.audience", label: "Audience" },
    ]);
  });

  it("coerces metaData select values to schema type", () => {
    const intSchema: ToolSchema = {
      type: "integer",
      metaData: {
        ui: "select",
        options: [
          { value: 1, label: "One" },
          { value: 2, label: "Two" },
        ],
      },
    };
    expect(parseWorkflowMetaSelectChange(intSchema, "2")).toBe(2);
    expect(normalizeWorkflowFieldValueForSchema(intSchema, "3.7")).toBe(4);
  });

  it("resolveStepCanvasCoords uses index-based fallbacks when canvas is missing", () => {
    const base = {
      localId: "a",
      label: "A",
      stepId: "a",
      toolName: "t",
      args: {},
    };
    expect(resolveStepCanvasCoords(base, 0)).toEqual(WORKFLOW_CANVAS_ORIGIN);
    expect(resolveStepCanvasCoords(base, 2)).toEqual({
      x: WORKFLOW_CANVAS_ORIGIN.x + 2 * WORKFLOW_CANVAS_STEP_SPACING_X,
      y: WORKFLOW_CANVAS_ORIGIN.y,
    });
  });

  it("computeInsertCanvasPosition append uses last index, not origin-only, when coords are missing", () => {
    const step = (i: number) => ({
      localId: `s${i}`,
      label: `S${i}`,
      stepId: `s${i}`,
      toolName: "t",
      args: {},
    });
    const three = [step(0), step(1), step(2)];
    const pos = computeInsertCanvasPosition(three, 3);
    expect(pos.x).toBe(WORKFLOW_CANVAS_ORIGIN.x + 3 * WORKFLOW_CANVAS_STEP_SPACING_X);
    expect(pos.y).toBe(WORKFLOW_CANVAS_ORIGIN.y);
  });
});
