"use client";

import React, { useRef } from "react";
import { Braces, ListPlus, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { WorkflowDynamicValueInserter } from "./WorkflowDynamicValueInserter";
import { WorkflowTemplateAutocompleteTextarea } from "./WorkflowTemplateAutocompleteTextarea";
import {
  buildWorkflowFieldInitialValue,
  detectTokenStepId,
  friendlyToolName,
  isOnlyLastResultToken,
  parseWorkflowMetaSelectChange,
  setValueAtPath,
  stringContainsLastResultToken,
  type ToolSchema,
  type WorkflowStepDraft,
  type WorkflowTool,
  workflowSelectControlString,
} from "./workflowsUtils";

/** shadcn Input uses ring-offset-2; offset rings can look like stray lines over numeric fields. */
const INPUT_FOCUS_NO_OFFSET =
  "ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-teal-500/30 focus-visible:border-teal-400/70";

/** Chromium draws spin buttons inside the field; with `rounded-2xl` they often overlap the value as a stray pill. */
const NUMBER_INPUT_NO_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function findResultLinkFromArgs(args: Record<string, unknown>) {
  for (const [path, value] of Object.entries(flattenArgs(args))) {
    const tokenStepId = detectTokenStepId(value);
    if (tokenStepId) {
      return {
        sourceStepId: tokenStepId,
        targetPath: path,
      };
    }
  }
  return null;
}

function flattenArgs(value: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(acc, flattenArgs(child as Record<string, unknown>, path));
    } else {
      acc[path] = child;
    }
    return acc;
  }, {});
}

export function WorkflowSchemaEditor({
  schema,
  value,
  onChange,
  previousSteps,
  resultLink,
  bindablePaths,
  onResultLinkChange,
  hideFieldDescriptions = false,
  toolLibrary = [],
}: {
  schema?: ToolSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  previousSteps: WorkflowStepDraft[];
  resultLink?: WorkflowStepDraft["resultLink"];
  bindablePaths: Array<{ path: string; label: string }>;
  onResultLinkChange: (nextLink: WorkflowStepDraft["resultLink"]) => void;
  /** When true, omit schema description paragraphs so the form stays scannable (e.g. step configure modal). */
  hideFieldDescriptions?: boolean;
  /** From GET /tools — enables return-shape paths in the insert menu and `{{` autocompletion. */
  toolLibrary?: WorkflowTool[];
}) {
  if (!schema?.properties) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-inner">
            <Braces className="h-5 w-5 text-slate-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">No form fields for this tool</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              This tool does not publish a parameter schema. Use <span className="font-medium text-slate-700">Args as JSON</span> in the
              advanced section below if you need custom input.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, property]) => (
        <SchemaField
          key={key}
          path={key}
          label={property.title ?? friendlyToolName(key)}
          schema={property}
          required={schema.required?.includes(key)}
          value={value[key]}
          onChange={(nextValue) => onChange(setValueAtPath(value, key, nextValue))}
          previousSteps={previousSteps}
          resultLink={resultLink}
          bindablePaths={bindablePaths}
          onResultLinkChange={onResultLinkChange}
          hideFieldDescriptions={hideFieldDescriptions}
          toolLibrary={toolLibrary}
        />
      ))}
    </div>
  );
}

function SchemaArrayStringRow({
  index,
  item,
  items,
  onChange,
  previousSteps,
  toolLibrary,
}: {
  index: number;
  item: unknown;
  items: unknown[];
  onChange: (next: unknown[]) => void;
  previousSteps: WorkflowStepDraft[];
  toolLibrary: WorkflowTool[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = typeof item === "string" || typeof item === "number" ? String(item) : "";

  return (
    <div className="flex items-center gap-2">
      <WorkflowDynamicValueInserter
        compact
        inputRef={inputRef}
        value={value}
        onInsert={(next) => {
          const nextItems = [...items];
          nextItems[index] = next;
          onChange(nextItems);
        }}
        previousSteps={previousSteps}
        toolLibrary={toolLibrary}
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          const nextItems = [...items];
          nextItems[index] = event.target.value;
          onChange(nextItems);
        }}
        className={`h-11 min-w-0 flex-1 rounded-2xl border-slate-200 bg-white ${INPUT_FOCUS_NO_OFFSET}`}
      />
      <button
        type="button"
        onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
        className="shrink-0 text-sm text-rose-600 hover:text-rose-700"
      >
        Remove
      </button>
    </div>
  );
}

function SchemaField({
  path,
  label,
  schema,
  required,
  value,
  onChange,
  previousSteps,
  resultLink,
  bindablePaths,
  onResultLinkChange,
  compact,
  hideFieldDescriptions = false,
  toolLibrary = [],
}: {
  path: string;
  label: string;
  schema: ToolSchema;
  required?: boolean;
  value: unknown;
  onChange: (nextValue: unknown) => void;
  previousSteps: WorkflowStepDraft[];
  resultLink?: WorkflowStepDraft["resultLink"];
  bindablePaths: Array<{ path: string; label: string }>;
  onResultLinkChange: (nextLink: WorkflowStepDraft["resultLink"]) => void;
  /** Array item or nested context: skip large heading (label still used for a11y). */
  compact?: boolean;
  hideFieldDescriptions?: boolean;
  toolLibrary?: WorkflowTool[];
}) {
  const fieldId = React.useId();
  const labelId = `${fieldId}-label`;
  const stringTextRef = useRef<HTMLTextAreaElement>(null);

  if (schema.type === "object" && schema.properties) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {schema.description && !hideFieldDescriptions ? (
            <p className="mt-1 text-sm text-slate-500">{schema.description}</p>
          ) : null}
        </div>
        <div className="space-y-4">
          {Object.entries(schema.properties).map(([key, property]) => (
            <SchemaField
              key={`${path}.${key}`}
              path={`${path}.${key}`}
              label={property.title ?? friendlyToolName(key)}
              schema={property}
              required={schema.required?.includes(key)}
              value={value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined}
              onChange={(nextValue) =>
                onChange(
                  setValueAtPath(
                    (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}) as Record<string, unknown>,
                    key,
                    nextValue,
                  ),
                )
              }
              previousSteps={previousSteps}
              resultLink={resultLink}
              bindablePaths={bindablePaths}
              onResultLinkChange={onResultLinkChange}
              compact={compact}
              hideFieldDescriptions={hideFieldDescriptions}
              toolLibrary={toolLibrary}
            />
          ))}
        </div>
      </div>
    );
  }

  if (schema.type === "array") {
    const items = Array.isArray(value) ? value : [];
    const itemSchema = schema.items;
    const itemLabel = itemSchema?.title ?? "Item";

    return (
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {label}
              {required ? <span className="ml-1 text-rose-500">*</span> : null}
            </p>
            {schema.description && !hideFieldDescriptions ? (
              <p className="mt-1 text-sm text-slate-500">{schema.description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-slate-200"
            onClick={() => onChange([...items, buildWorkflowFieldInitialValue(itemSchema)])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/80 px-4 py-6 text-center">
              <ListPlus className="h-8 w-8 text-slate-400" aria-hidden />
              <p className="text-sm font-medium text-slate-700">No {label.toLowerCase()} yet</p>
              <p className="max-w-xs text-xs leading-relaxed text-slate-500">
                Use <span className="font-medium text-slate-600">Add</span> to create the first entry. You can remove rows later.
              </p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={`${path}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {itemSchema?.type === "object" && itemSchema.properties ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        {itemLabel} {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                        className="text-sm text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                    {Object.entries(itemSchema.properties).map(([childKey, childSchema]) => (
                      <SchemaField
                        key={`${path}-${index}-${childKey}`}
                        path={`${path}.${index}.${childKey}`}
                        label={childSchema.title ?? friendlyToolName(childKey)}
                        schema={childSchema}
                        required={itemSchema.required?.includes(childKey)}
                        value={item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>)[childKey] : undefined}
                        onChange={(nextValue) => {
                          const nextItems = structuredClone(items);
                          const nextItem =
                            nextItems[index] && typeof nextItems[index] === "object" && !Array.isArray(nextItems[index])
                              ? (nextItems[index] as Record<string, unknown>)
                              : {};
                          nextItem[childKey] = nextValue;
                          nextItems[index] = nextItem;
                          onChange(nextItems);
                        }}
                        previousSteps={previousSteps}
                        resultLink={resultLink}
                        bindablePaths={bindablePaths}
                        onResultLinkChange={onResultLinkChange}
                        compact
                        hideFieldDescriptions={hideFieldDescriptions}
                        toolLibrary={toolLibrary}
                      />
                    ))}
                  </div>
                ) : itemSchema ? (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <SchemaField
                        path={`${path}.${index}`}
                        label={`${itemLabel} ${index + 1}`}
                        schema={itemSchema}
                        required={false}
                        value={item}
                        onChange={(nextValue) => {
                          const nextItems = [...items];
                          nextItems[index] = nextValue;
                          onChange(nextItems);
                        }}
                        previousSteps={previousSteps}
                        resultLink={resultLink}
                        bindablePaths={bindablePaths}
                        onResultLinkChange={onResultLinkChange}
                        compact
                        hideFieldDescriptions={hideFieldDescriptions}
                        toolLibrary={toolLibrary}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                      className="shrink-0 pt-2 text-sm text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <SchemaArrayStringRow
                    index={index}
                    item={item}
                    items={items}
                    onChange={onChange}
                    previousSteps={previousSteps}
                    toolLibrary={toolLibrary}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const fieldValue = value ?? "";
  const tokenStepId = detectTokenStepId(fieldValue);
  const isLinkedField = resultLink?.targetPath === path;

  const bindableSelect =
    schema.type === "string" && bindablePaths.some((item) => item.path === path) ? (
      <select
        value={isLinkedField && tokenStepId ? tokenStepId : ""}
        onChange={(event) => {
          const sourceStepId = event.target.value;
          onResultLinkChange(
            sourceStepId
              ? {
                  sourceStepId,
                  targetPath: path,
                }
              : null,
          );
        }}
        className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
      >
        <option value="">Use your own text</option>
        {previousSteps.map((step) => (
          <option key={step.localId} value={step.stepId}>
            Use {step.label || friendlyToolName(step.toolName)}
          </option>
        ))}
      </select>
    ) : null;

  const showStringDynPicker =
    schema.type === "string" &&
    !schema.enum?.length &&
    !(schema.metaData?.ui === "select" && schema.metaData.options?.length);

  const dynamicValuePicker = showStringDynPicker ? (
    <WorkflowDynamicValueInserter
      inputRef={stringTextRef}
      value={typeof fieldValue === "string" ? fieldValue : ""}
      onInsert={(next) => onChange(next)}
      previousSteps={previousSteps}
      toolLibrary={toolLibrary}
      compact={compact}
    />
  ) : null;

  const controls = (
    <>
      {schema.enum?.length ? (
        <select
          id={fieldId}
          aria-labelledby={labelId}
          value={String(fieldValue)}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-400/80 focus:ring-2 focus:ring-teal-500/20 ${INPUT_FOCUS_NO_OFFSET}`}
        >
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      ) : schema.metaData?.ui === "select" && schema.metaData.options?.length ? (
        <select
          id={fieldId}
          aria-labelledby={labelId}
          value={workflowSelectControlString(schema, value)}
          onChange={(event) => onChange(parseWorkflowMetaSelectChange(schema, event.target.value))}
          className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-400/80 focus:ring-2 focus:ring-teal-500/20 ${INPUT_FOCUS_NO_OFFSET}`}
        >
          {schema.metaData.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label !== undefined ? String(option.label) : String(option.value)}
            </option>
          ))}
        </select>
      ) : schema.type === "boolean" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <input
            id={fieldId}
            aria-labelledby={labelId}
            type="checkbox"
            checked={Boolean(fieldValue)}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
          />
          <span className="text-sm text-slate-700">Turn this on</span>
        </div>
      ) : schema.type === "number" || schema.type === "integer" ? (
        <Input
          id={fieldId}
          aria-labelledby={labelId}
          type="number"
          value={typeof fieldValue === "number" ? fieldValue : Number(fieldValue) || 0}
          onChange={(event) => onChange(schema.type === "integer" ? Math.round(Number(event.target.value)) : Number(event.target.value))}
          className={`h-11 rounded-2xl border-slate-200 bg-white ${NUMBER_INPUT_NO_SPINNER} ${INPUT_FOCUS_NO_OFFSET}`}
        />
      ) : showStringDynPicker ? (
        <WorkflowTemplateAutocompleteTextarea
          ref={stringTextRef}
          id={fieldId}
          aria-labelledby={labelId}
          value={typeof fieldValue === "string" ? fieldValue : ""}
          onChange={(next) => onChange(next)}
          previousSteps={previousSteps}
          toolLibrary={toolLibrary}
          placeholder={schema.format === "uri" ? "https://example.com" : ""}
          rows={5}
          className={`min-h-[100px] ${INPUT_FOCUS_NO_OFFSET}`}
        />
      ) : (
        <textarea
          ref={stringTextRef}
          id={fieldId}
          aria-labelledby={labelId}
          value={typeof fieldValue === "string" ? fieldValue : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={schema.format === "uri" ? "https://example.com" : ""}
          className={`block min-h-[100px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400/80 focus:ring-2 focus:ring-teal-500/20 ${INPUT_FOCUS_NO_OFFSET}`}
        />
      )}

      {tokenStepId ? (
        <div className="rounded-full bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
          {`This field uses the result from "${tokenStepId}".`}
        </div>
      ) : typeof fieldValue === "string" && stringContainsLastResultToken(fieldValue) ? (
        <div className="rounded-full bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
          {isOnlyLastResultToken(fieldValue)
            ? "This field uses the previous step's output ({{ last }})."
            : "This field includes {{ last }} — resolved when you run the workflow."}
        </div>
      ) : null}
    </>
  );

  const headerBlock =
    compact
      ? bindableSelect || dynamicValuePicker
        ? (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {dynamicValuePicker}
              {bindableSelect}
            </div>
          )
        : null
      : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label htmlFor={fieldId} id={labelId} className="text-sm font-semibold text-slate-800">
                {label}
                {required ? <span className="ml-1 text-rose-500">*</span> : null}
              </label>
              {schema.description && !hideFieldDescriptions ? (
                <p className="mt-1 text-sm text-slate-500">{schema.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {dynamicValuePicker}
              {bindableSelect}
            </div>
          </div>
        );

  const shellClass = compact
    ? "space-y-2 rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-2.5"
    : "space-y-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm";

  if (compact) {
    return (
      <div className={shellClass} role="group" aria-labelledby={labelId}>
        <span id={labelId} className="sr-only">
          {label}
        </span>
        {headerBlock}
        {controls}
      </div>
    );
  }

  return (
    <div className={`${shellClass} block`}>
      {headerBlock}
      {controls}
    </div>
  );
}
