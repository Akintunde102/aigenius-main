import type { ToolSchema, WorkflowArgSummaryLine } from './workflow-types';
import { friendlyToolName } from './workflow-string.utils';
import { detectTokenStepId, isOnlyLastResultToken, stringContainsLastResultToken } from './workflow-token.utils';

const ARG_SUMMARY_MAX_LINES = 5;
const ARG_SUMMARY_MAX_STRING = 72;

function truncateArgSummaryString(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function formatArgValueForSummary(
  value: unknown,
  resolveStepLabel: (stepId: string) => string | undefined,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") {
    const tokenStepId = detectTokenStepId(value);
    if (tokenStepId) {
      const label = resolveStepLabel(tokenStepId)?.trim();
      return label ? `← ${truncateArgSummaryString(label, 48)}` : "← Previous step result";
    }
    if (isOnlyLastResultToken(value)) {
      return "← Previous step";
    }
    if (stringContainsLastResultToken(value)) {
      const hinted = value.replace(/\{\{\s*last\s*\}\}/gi, "⟨previous⟩");
      return truncateArgSummaryString(hinted, ARG_SUMMARY_MAX_STRING);
    }
    if (value.trim() === "") return "(empty)";
    return truncateArgSummaryString(value, ARG_SUMMARY_MAX_STRING);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "No items";
    const first = value[0];
    if (value.length === 1 && typeof first === "object" && first !== null && !Array.isArray(first)) {
      return "1 item (object)";
    }
    return `${value.length} items`;
  }
  if (typeof value === "object") {
    const n = Object.keys(value as object).length;
    return n === 0 ? "{ }" : `${n} fields`;
  }
  return String(value);
}

/**
 * Builds short label/value lines for the workflow canvas card body, using JSON Schema titles when present.
 */
export function summarizeWorkflowStepArgsForDisplay(
  args: Record<string, unknown>,
  parametersSchema: ToolSchema | undefined,
  resolveStepLabel: (stepId: string) => string | undefined,
): WorkflowArgSummaryLine[] {
  const props = parametersSchema?.properties;
  const orderedKeys: string[] = [];
  if (props) {
    for (const k of Object.keys(props)) {
      if (Object.prototype.hasOwnProperty.call(args, k)) orderedKeys.push(k);
    }
  }
  for (const k of Object.keys(args)) {
    if (!orderedKeys.includes(k)) orderedKeys.push(k);
  }

  if (orderedKeys.length === 0) {
    return [{ label: "Values", value: "No fields yet — open the editor" }];
  }

  const lines: WorkflowArgSummaryLine[] = [];
  const cap = Math.min(orderedKeys.length, ARG_SUMMARY_MAX_LINES);
  for (let i = 0; i < cap; i++) {
    const key = orderedKeys[i];
    if (key === undefined) continue;
    const propSchema = props?.[key];
    const label = propSchema?.title?.trim() || friendlyToolName(key);
    const value = formatArgValueForSummary(args[key], resolveStepLabel);
    lines.push({ label, value });
  }

  if (orderedKeys.length > ARG_SUMMARY_MAX_LINES) {
    lines.push({
      label: "More",
      value: `+${orderedKeys.length - ARG_SUMMARY_MAX_LINES} in editor`,
    });
  }

  return lines;
}

export function categorizeTool(toolName: string): string {
  if (toolName.startsWith("serper_")) return "Search";
  if (toolName.startsWith("firecrawl_")) return "Web pages";
  if (toolName.startsWith("gmail_")) return "Gmail";
  if (toolName.startsWith("linkedin_")) return "LinkedIn";
  if (toolName.startsWith("keep_")) return "Notes";
  if (toolName === "web_fetch") return "Web pages";
  if (toolName === "call_model") return "AI thinking";
  if (toolName === "get_wallet_balance") return "Wallet";
  if (toolName.includes("pdf")) return "Documents";
  return "Other tools";
}

/** Inserts a token at the caret (or appends when `el` is null). Used by workflow dynamic value UI. */
export function insertTokenAtCaret(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  token: string,
  onValueChange: (next: string) => void,
): void {
  if (!el) {
    onValueChange(value + token);
    return;
  }
  const start = typeof el.selectionStart === "number" ? el.selectionStart : value.length;
  const end = typeof el.selectionEnd === "number" ? el.selectionEnd : value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  onValueChange(next);
  const caret = start + token.length;
  window.setTimeout(() => {
    el.focus();
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      /* some input types omit setSelectionRange */
    }
  }, 0);
}
