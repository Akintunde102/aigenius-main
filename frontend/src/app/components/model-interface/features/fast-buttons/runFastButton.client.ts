import toast from "react-hot-toast";
import { getRunnableLocalDesktopBridge } from "@/lib/utils/desktop-runtime";
import { resolveProjectScopeForChatRequest } from "@/lib/code-projects/chat-project-scope";
import {
  completeFastButtonRun,
  startFastButtonRun,
  type FastButtonConfig,
  type FastButtonKind,
  type StartRunResponse,
} from "./fastButtonsApi";

export type FastButtonRunCallbacks = {
  onStdout?: (chunk: string) => void;
  onStatus?: (status: string) => void;
};

function shellSummary(stdout: string, stderr: string, exitCode?: number): string {
  const head = stdout.trim().split("\n").slice(0, 8).join("\n");
  const err = stderr.trim() ? `\nstderr: ${stderr.trim().split("\n").slice(0, 4).join("\n")}` : "";
  return `exit ${exitCode ?? "?"}\n${head}${err}`.trim();
}

async function runShellCommand(
  run: StartRunResponse,
  config: FastButtonConfig,
  callbacks?: FastButtonRunCallbacks,
): Promise<void> {
  const command = config.command?.trim();
  if (!command) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: "Shell button has no command configured.",
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  const desktop = getRunnableLocalDesktopBridge();
  if (!desktop?.runLocalDesktopTool) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: "Shell buttons require the AIGenius desktop app with local terminal access.",
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  callbacks?.onStatus?.("running");
  let stdout = "";
  let stderr = "";
  const out = await desktop.runLocalDesktopTool(
    {
      tool: "local_shell",
      arguments: {
        command,
        ...(config.cwd?.trim() ? { cwd: config.cwd.trim() } : {}),
      },
    },
    {
      onShellStreamChunk: (chunk) => {
        if (chunk.stream === "stdout") stdout += chunk.text;
        else stderr += chunk.text;
        callbacks?.onStdout?.(chunk.text);
      },
    },
  );

  if (!out.ok) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: out.error ?? "Shell command failed",
      stdoutPreview: (stdout || stderr).slice(0, 8000),
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  let parsedExit: number | undefined;
  try {
    const inner = JSON.parse(out.result ?? "{}") as { exit_code?: number; stdout?: string; stderr?: string };
    if (typeof inner.stdout === "string") stdout = inner.stdout;
    if (typeof inner.stderr === "string") stderr = inner.stderr;
    if (typeof inner.exit_code === "number") parsedExit = inner.exit_code;
  } catch {
    /* use streamed stdout */
  }

  const summary = shellSummary(stdout, stderr, parsedExit);
  await completeFastButtonRun(run.runId, {
    status: "succeeded",
    summary,
    stdoutPreview: stdout.slice(0, 8000),
  });
  callbacks?.onStatus?.("succeeded");
}

async function runChatInstruction(
  run: StartRunResponse,
  config: FastButtonConfig,
  callbacks?: FastButtonRunCallbacks,
): Promise<void> {
  const instruction = config.instruction?.trim() || run.label;
  if (!instruction) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: "Missing instruction on this chat button.",
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  callbacks?.onStatus?.("running");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aigenius:insert-prompt", {
        detail: { text: instruction },
      }),
    );
  }

  await completeFastButtonRun(run.runId, {
    status: "succeeded",
    summary: instruction.length > 280 ? `${instruction.slice(0, 277)}…` : instruction,
    conversationId: run.conversationId ?? undefined,
  });
  callbacks?.onStatus?.("succeeded");
  callbacks?.onStdout?.("Prompt inserted into chat composer.\n");
}

async function runAgentInstruction(
  run: StartRunResponse,
  config: FastButtonConfig,
  callbacks?: FastButtonRunCallbacks,
): Promise<void> {
  const instruction = config.instruction?.trim();
  if (!instruction) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: "Missing instruction on this button.",
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  callbacks?.onStatus?.("running");

  const conversationId = run.conversationId;
  if (!conversationId) {
    await completeFastButtonRun(run.runId, {
      status: "failed",
      errorMessage: "No conversation id for agent run.",
    });
    callbacks?.onStatus?.("failed");
    return;
  }

  try {
    await completeFastButtonRun(run.runId, {
      status: "succeeded",
      summary: instruction.length > 280 ? `${instruction.slice(0, 277)}…` : instruction,
      conversationId,
    });
  } catch {
    /* Conversation already exists; status sync is best-effort. */
  }
  callbacks?.onStatus?.("succeeded");
  callbacks?.onStdout?.(
    "Agent conversation created. Open conversation link to begin execution with your selected model and tools.\n",
  );
}

export async function executeFastButtonRun(
  buttonId: string,
  callbacks?: FastButtonRunCallbacks,
): Promise<StartRunResponse & { kind: FastButtonKind }> {
  const { projectScopeId } = resolveProjectScopeForChatRequest();
  const run = await startFastButtonRun(buttonId, projectScopeId);
  callbacks?.onStatus?.("started");

  try {
    if (run.kind === "shell_command") {
      await runShellCommand(run, run.config, callbacks);
    } else if (run.kind === "chat_instruction") {
      await runChatInstruction(run, run.config, callbacks);
    } else {
      await runAgentInstruction(run, run.config, callbacks);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Fast button failed";
    await completeFastButtonRun(run.runId, { status: "failed", errorMessage: msg });
    callbacks?.onStatus?.("failed");
    throw e;
  }

  return run;
}

export function toastFastButtonFinished(label: string, conversationId?: string | null) {
  if (conversationId) {
    toast.success(`${label} ready — open chat for full results`);
  } else {
    toast.success(`${label} executed`);
  }
}
