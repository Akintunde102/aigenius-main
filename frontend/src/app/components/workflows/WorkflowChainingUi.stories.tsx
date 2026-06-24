import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React, { useRef, useState } from "react";
import { WorkflowDynamicValueInserter } from "./WorkflowDynamicValueInserter";
import { WorkflowTemplateAutocompleteTextarea } from "./WorkflowTemplateAutocompleteTextarea";
import { WorkflowAboutToolPanel } from "./workflow-info";
import type { WorkflowStepDraft, WorkflowTool } from "./workflowsUtils";

const meta = {
  title: "Workflows/Chaining UI",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Workflow step chaining: `{{` autocomplete, insert menu, and return-shape hints on the about panel.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const mockToolLibrary: WorkflowTool[] = [
  {
    type: "function",
    function: { name: "call_model", description: "Run an LLM call." },
    workflowDescription: "Calls a model and returns assistant output.",
    workflowExamples: ["Summarize the prior step.", "Draft a reply from context."],
    workflowToolResponse: {
      summary: "Assistant message plus optional usage metadata.",
      chainingPaths: ["content", "usage.total_tokens", "role"],
      exampleJson: JSON.stringify(
        { role: "assistant", content: "Example reply text.", usage: { total_tokens: 42 } },
        null,
        2,
      ),
      resultJsonSchema: {
        type: "object",
        required: ["role", "content"],
        properties: {
          role: { type: "string" },
          content: { type: "string" },
          usage: { type: "object" },
        },
      },
    },
  },
  {
    type: "function",
    function: { name: "serper_google_search", description: "Web search." },
    workflowToolResponse: {
      summary: "Search hits with titles and snippets.",
      chainingPaths: ["results.0.title", "results.0.snippet"],
      exampleJson: JSON.stringify({ results: [{ title: "A", snippet: "B" }] }),
    },
  },
];

const previousSteps: WorkflowStepDraft[] = [
  {
    localId: "local-1",
    label: "Draft",
    stepId: "step-draft",
    toolName: "call_model",
    args: { prompt: "Hello" },
  },
];

export const AboutToolPanelWithReturnShape: Story = {
  name: "About panel — return shape",
  render: () => (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white shadow-sm">
      <WorkflowAboutToolPanel
        body="Runs a model with your prompt and returns structured JSON you can chain into the next step."
        examples={["Turn bullet notes into an email.", "Classify the previous JSON into a label."]}
        returnShapeSummary="Assistant message plus optional usage metadata."
        chainingPaths={["content", "usage.total_tokens", "role"]}
        exampleJson={JSON.stringify({ role: "assistant", content: "Hi", usage: { total_tokens: 10 } }, null, 2)}
        resultJsonSchema={{
          type: "object",
          properties: { role: { type: "string" }, content: { type: "string" } },
        }}
      />
    </div>
  ),
};

function AutocompletePlayground() {
  const [value, setValue] = useState("Subject: {{");
  return (
    <div className="max-w-lg space-y-2">
      <p className="text-xs text-slate-600">
        Focus the field and type after <code className="rounded bg-slate-100 px-1">{"{{"}</code> — completion list
        should open; Enter inserts a token.
      </p>
      <WorkflowTemplateAutocompleteTextarea
        value={value}
        onChange={setValue}
        previousSteps={previousSteps}
        toolLibrary={mockToolLibrary}
        rows={4}
        placeholder="Try {{ then last or a step id…"
      />
    </div>
  );
}

export const TemplateAutocomplete: Story = {
  name: "Template field — {{ autocomplete",
  render: () => <AutocompletePlayground />,
};

function InserterWithField() {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="max-w-lg space-y-2">
      <p className="text-xs text-slate-600">
        Use <strong>Insert value</strong> for chained paths; type <code className="rounded bg-slate-100 px-1">{"{{"}</code>{" "}
        for the same suggestions inline.
      </p>
      <WorkflowTemplateAutocompleteTextarea
        ref={ref}
        value={value}
        onChange={setValue}
        previousSteps={previousSteps}
        toolLibrary={mockToolLibrary}
        rows={3}
      />
      <WorkflowDynamicValueInserter
        inputRef={ref}
        value={value}
        onInsert={setValue}
        previousSteps={previousSteps}
        toolLibrary={mockToolLibrary}
      />
    </div>
  );
}

export const InserterAndAutocomplete: Story = {
  name: "Insert menu + field",
  render: () => <InserterWithField />,
};
