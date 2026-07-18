"use client";

import { useMemo, type ReactNode } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/github.css";
import "@/app/components/model-interface/shared/components/hljs-dark-theme.scss";
import { cn } from "@/lib/utils";

let jsonLanguageRegistered = false;

function ensureJsonLanguage() {
  if (!jsonLanguageRegistered) {
    hljs.registerLanguage("json", json);
    jsonLanguageRegistered = true;
  }
}

/** Pretty-print for display; keeps non-JSON strings as-is. */
export function formatJsonForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) {
      return "";
    }
    try {
      return JSON.stringify(JSON.parse(t) as unknown, null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export type JsonSyntaxBlockProps = {
  value: unknown;
  className?: string;
  preClassName?: string;
  codeClassName?: string;
  emptyFallback?: ReactNode;
};

/**
 * Read-only JSON with pretty-printing and highlight.js styling (github theme).
 */
export type JsonOrPlainTextBlockProps = {
  text: string;
  className?: string;
  preClassName?: string;
  codeClassName?: string;
};

/**
 * If `text` parses as JSON object/array, renders highlighted JSON; otherwise plain preformatted text.
 */
export function JsonOrPlainTextBlock({ text, className, preClassName, codeClassName }: JsonOrPlainTextBlockProps) {
  const parsed = useMemo(() => {
    const t = text.trim();
    if (!t) {
      return { kind: "empty" as const };
    }
    try {
      const v = JSON.parse(t) as unknown;
      if (v !== null && typeof v === "object") {
        return { kind: "json" as const, value: v };
      }
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return { kind: "json" as const, value: v };
      }
    } catch {
      /* keep as text */
    }
    return { kind: "text" as const, text };
  }, [text]);

  if (parsed.kind === "empty") {
    return null;
  }
  if (parsed.kind === "json") {
    return (
      <JsonSyntaxBlock
        value={parsed.value}
        className={className}
        preClassName={preClassName}
        codeClassName={codeClassName}
      />
    );
  }
  return (
    <pre
      className={cn(
        "m-0 whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-slate-800 [overflow-wrap:anywhere]",
        "dark:text-zinc-200",
        preClassName,
        className,
      )}
      tabIndex={0}
    >
      {parsed.text}
    </pre>
  );
}

export function JsonSyntaxBlock({
  value,
  className,
  preClassName,
  codeClassName,
  emptyFallback = null,
}: JsonSyntaxBlockProps) {
  const html = useMemo(() => {
    ensureJsonLanguage();
    const raw = formatJsonForDisplay(value);
    if (!raw.trim()) {
      return "";
    }
    try {
      return hljs.highlight(raw, { language: "json", ignoreIllegals: true }).value;
    } catch {
      return hljs.highlightAuto(raw).value;
    }
  }, [value]);

  if (!html) {
    return <>{emptyFallback}</>;
  }

  return (
    <pre
      className={cn(
        "m-0 overflow-auto rounded-md border border-slate-200/90 bg-white p-2.5 text-left text-slate-900",
        "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        preClassName,
        className,
      )}
      tabIndex={0}
    >
      <code
        className={cn("hljs language-json block whitespace-pre font-mono text-[11px] leading-relaxed", codeClassName)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}
