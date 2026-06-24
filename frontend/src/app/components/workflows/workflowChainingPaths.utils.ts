import type { WorkflowStepDraft, WorkflowTool, WorkflowToolResponse } from "./workflowsUtils";

const MAX_INFERRED_PATHS = 24;
const MAX_INFER_DEPTH = 4;

export function inferChainingPathsFromExampleJson(exampleJson: string | undefined): string[] {
  if (!exampleJson?.trim()) return [];
  try {
    const parsed = JSON.parse(exampleJson) as unknown;
    const out = new Set<string>();
    walkValueForPaths(parsed, "", 0, out);
    return Array.from(out).slice(0, MAX_INFERRED_PATHS);
  } catch {
    return [];
  }
}

function walkValueForPaths(value: unknown, prefix: string, depth: number, out: Set<string>): void {
  if (out.size >= MAX_INFERRED_PATHS || depth >= MAX_INFER_DEPTH) return;
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    const nextPrefix = prefix ? `${prefix}.0` : "0";
    walkValueForPaths(value[0], nextPrefix, depth + 1, out);
    return;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of Object.keys(o)) {
      if (out.size >= MAX_INFERRED_PATHS) break;
      const path = prefix ? `${prefix}.${key}` : key;
      out.add(path);
      walkValueForPaths(o[key], path, depth + 1, out);
    }
  }
}

export function getSuggestedChainingPathsForWorkflowResponse(response: WorkflowToolResponse | undefined): string[] {
  if (!response) return [];
  const curated = response.chainingPaths?.map((p) => p.trim()).filter((p) => p.length > 0) ?? [];
  if (curated.length > 0) return Array.from(new Set(curated)).slice(0, MAX_INFERRED_PATHS);
  return inferChainingPathsFromExampleJson(response.exampleJson);
}

export function getChainingPathsForWorkflowTool(tool: WorkflowTool | undefined): string[] {
  return getSuggestedChainingPathsForWorkflowResponse(tool?.workflowToolResponse);
}

/** Matches backend `substituteWorkflowTemplatesInString` patterns for `{{ last }}` / `{{ last.x }}`. */
export function createChainedLastToken(dotPath?: string): string {
  if (!dotPath?.trim()) return "{{ last }}";
  return `{{ last.${dotPath.trim()} }}`;
}

/** Matches `{{steps.id.result}}` and `{{steps.id.result.path}}` (spacing-tolerant on the server). */
export function createChainedStepResultToken(stepId: string, dotPath?: string): string {
  const id = stepId.trim();
  if (!dotPath?.trim()) return `{{steps.${id}.result}}`;
  return `{{steps.${id}.result.${dotPath.trim()}}}`;
}

export type WorkflowTemplateCompletionItem = {
  label: string;
  insertText: string;
  detail?: string;
};

const MAX_COMPLETION_ITEMS = 64;

export function buildWorkflowTemplateCompletionItems(
  previousSteps: WorkflowStepDraft[],
  toolLibrary: WorkflowTool[],
): WorkflowTemplateCompletionItem[] {
  const byName = new Map(toolLibrary.map((t) => [t.function.name, t]));
  const seen = new Set<string>();
  const out: WorkflowTemplateCompletionItem[] = [];

  const push = (item: WorkflowTemplateCompletionItem) => {
    if (out.length >= MAX_COMPLETION_ITEMS) return;
    if (seen.has(item.insertText)) return;
    seen.add(item.insertText);
    out.push(item);
  };

  const earlierOnly = previousSteps.length > 1 ? previousSteps.slice(0, -1) : [];

  if (previousSteps.length > 0) {
    push({
      label: "last (full output)",
      insertText: "{{ last }}",
      detail: "Prior step JSON string",
    });
    const prev = previousSteps[previousSteps.length - 1];
    const prevTool = byName.get(prev.toolName);
    for (const p of getChainingPathsForWorkflowTool(prevTool)) {
      push({
        label: `last.${p}`,
        insertText: createChainedLastToken(p),
        detail: prev.label?.trim() || prev.toolName,
      });
    }
  }

  for (const st of earlierOnly) {
    const t = byName.get(st.toolName);
    push({
      label: `${st.label?.trim() || st.toolName} — full`,
      insertText: createChainedStepResultToken(st.stepId),
      detail: st.stepId,
    });
    for (const p of getChainingPathsForWorkflowTool(t)) {
      push({
        label: `${st.stepId}.${p}`,
        insertText: createChainedStepResultToken(st.stepId, p),
        detail: st.label?.trim() || st.toolName,
      });
    }
  }

  return out;
}

export function filterTemplateCompletionsByPrefix(
  items: WorkflowTemplateCompletionItem[],
  prefixAfterBrace: string,
): WorkflowTemplateCompletionItem[] {
  const t = prefixAfterBrace.trim().toLowerCase();
  if (!t) return items;
  return items.filter(
    (item) =>
      item.insertText.toLowerCase().includes(t) || item.label.toLowerCase().includes(t) || (item.detail?.toLowerCase().includes(t) ?? false),
  );
}
