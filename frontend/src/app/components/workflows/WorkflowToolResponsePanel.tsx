"use client";

import { JsonSyntaxBlock } from "@/app/components/JsonSyntaxBlock";
import type { WorkflowTool, WorkflowToolResponse } from "./workflowsUtils";

type WorkflowToolResponsePanelProps = {
  /** When omitted, renders nothing (e.g. tool not loaded yet). */
  tool?: WorkflowTool | null;
  /** Override or use without full tool (e.g. tests). */
  response?: WorkflowToolResponse | null;
  className?: string;
};

/**
 * Dashboard: show declared JSON result shape for workflow template chaining.
 * Embed in a tool card tab next to parameters / examples — pass `tool` from GET /tools.
 */
export function WorkflowToolResponsePanel({
  tool,
  response: responseProp,
  className = "",
}: WorkflowToolResponsePanelProps) {
  const response = responseProp ?? tool?.workflowToolResponse;
  if (!response) {
    return null;
  }
  const summary = response.summary?.trim() ?? "";
  const hasExample = Boolean(response.exampleJson?.trim());
  const hasSchema =
    response.resultJsonSchema != null && Object.keys(response.resultJsonSchema).length > 0;
  if (!summary && !hasExample && !hasSchema) {
    return null;
  }

  return (
    <div className={`space-y-3 text-sm ${className}`.trim()}>
      {summary ? (
        <div>
          <h4 className="mb-1 font-medium text-neutral-200">Response (workflow chaining)</h4>
          <p className="whitespace-pre-wrap text-neutral-400">{summary}</p>
        </div>
      ) : null}
      {response.exampleJson?.trim() ? (
        <div>
          <h4 className="mb-1 font-medium text-neutral-200">Example JSON</h4>
          <JsonSyntaxBlock
            value={response.exampleJson.trim()}
            preClassName="max-h-64 border-neutral-600 bg-neutral-950/90"
            codeClassName="text-xs text-neutral-200"
          />
        </div>
      ) : null}
      {response.resultJsonSchema && Object.keys(response.resultJsonSchema).length > 0 ? (
        <div>
          <h4 className="mb-1 font-medium text-neutral-200">Response JSON Schema</h4>
          <JsonSyntaxBlock
            value={response.resultJsonSchema}
            preClassName="max-h-64 border-neutral-600 bg-neutral-950/90"
            codeClassName="text-xs text-neutral-200"
          />
        </div>
      ) : null}
    </div>
  );
}
