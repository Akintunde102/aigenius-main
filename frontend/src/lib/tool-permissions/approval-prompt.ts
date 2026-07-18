export type ToolApprovalPromptRequest = {
  tool: string;
  displayName: string;
  arguments?: Record<string, unknown>;
};

type ToolApprovalHandler = (request: ToolApprovalPromptRequest) => Promise<boolean>;

let handler: ToolApprovalHandler | null = null;

export function registerToolApprovalHandler(next: ToolApprovalHandler | null): void {
  handler = next;
}

export async function promptToolApproval(request: ToolApprovalPromptRequest): Promise<boolean> {
  if (!handler) {
    return true;
  }
  return handler(request);
}
