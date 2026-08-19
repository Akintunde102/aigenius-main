import { LAST_RESULT_TOKEN, LAST_RESULT_TOKEN_REGEX, type ToolSchema } from './workflow-types';
import { cloneValue } from './workflow-clone.utils';
import { friendlyToolName } from './workflow-string.utils';

export function createLastResultToken(): string {
  return LAST_RESULT_TOKEN;
}

export function stringContainsLastResultToken(str: string): boolean {
  LAST_RESULT_TOKEN_REGEX.lastIndex = 0;
  return LAST_RESULT_TOKEN_REGEX.test(str);
}

export function isOnlyLastResultToken(value: unknown): boolean {
  return typeof value === "string" && /^\s*\{\{\s*last(?:\.[^}]*)?\s*\}\}\s*$/i.test(value);
}

/** True if any string anywhere in `args` contains `{{ last }}`. */
export function scanArgsForLastToken(value: unknown): boolean {
  if (typeof value === "string") {
    return stringContainsLastResultToken(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => scanArgsForLastToken(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => scanArgsForLastToken(v));
  }
  return false;
}

export function createResultToken(stepId: string): string {
  return `{{steps.${stepId}.result}}`;
}

export function detectTokenStepId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\{\{steps\.([^.}]+)\.result\}\}$/);
  return match?.[1] ?? null;
}

export function getValueAtPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function setValueAtPath(value: Record<string, unknown>, path: string, nextValue: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const clone = cloneValue(value) as Record<string, unknown>;
  let pointer: Record<string, unknown> = clone;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = nextValue;
      return;
    }

    const current = pointer[key];
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      pointer[key] = {};
    }
    pointer = pointer[key] as Record<string, unknown>;
  });

  return clone;
}

export function removeValueAtPath(value: Record<string, unknown>, path: string): Record<string, unknown> {
  const keys = path.split(".");
  const clone = cloneValue(value) as Record<string, unknown>;
  let pointer: Record<string, unknown> = clone;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = "";
      return;
    }
    const current = pointer[key];
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return;
    }
    pointer = current as Record<string, unknown>;
  });

  return clone;
}

export function listBindablePaths(schema?: ToolSchema, prefix = ""): Array<{ path: string; label: string }> {
  if (!schema) return [];

  if (schema.type === "object" && schema.properties) {
    return Object.entries(schema.properties).flatMap(([key, property]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (property.type === "object") {
        return listBindablePaths(property, path);
      }
      if (property.type === "string") {
        return [{ path, label: property.title ?? friendlyToolName(path) }];
      }
      return [];
    });
  }

  return [];
}
