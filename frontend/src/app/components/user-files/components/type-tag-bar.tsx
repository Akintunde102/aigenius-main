"use client";

import { CATEGORY_THEME } from "../user-files.theme";
import {
  USER_FILE_CATEGORY_LABELS,
  USER_FILE_CATEGORY_ORDER,
  type UserFileCategory,
} from "../user-files.utils";
import type { CloudFile } from "@/app/components/file/file.interface";
import type { NavFilter } from "./user-files-browser.types";


export function TypeTagBar({
  compact,
  modelPickerStyle,
  navFilter,
  onNavFilter,
  grouped,
  totalCount,
}: {
  compact?: boolean;
  modelPickerStyle?: boolean;
  navFilter: NavFilter;
  onNavFilter: (n: NavFilter) => void;
  grouped: Record<UserFileCategory, CloudFile[]>;
  totalCount: number;
}) {
  return (
    <div
      className={
        modelPickerStyle
          ? "flex min-w-0 flex-1 flex-wrap items-center gap-2"
          : `flex flex-wrap border-b border-gray-200 ${compact ? "gap-1.5 pb-2" : "gap-2 pb-3"
          }`
      }
      role="tablist"
      aria-label="File type"
    >
      <TypeTag
        compact={compact}
        modelPickerStyle={modelPickerStyle}
        active={navFilter === "all"}
        onClick={() => onNavFilter("all")}
        label="All"
        count={totalCount}
        activeClass="bg-cyan-600 text-white"
      />
      {USER_FILE_CATEGORY_ORDER.map((cat) => {
        const count = grouped[cat].length;
        if (count === 0) return null;
        const t = CATEGORY_THEME[cat];
        return (
          <TypeTag
            key={cat}
            compact={compact}
            modelPickerStyle={modelPickerStyle}
            active={navFilter === cat}
            onClick={() => onNavFilter(cat)}
            label={USER_FILE_CATEGORY_LABELS[cat]}
            count={count}
            activeClass={`${t.chip} text-white`}
          />
        );
      })}
    </div>
  );
}

function TypeTag({
  compact,
  modelPickerStyle,
  active,
  onClick,
  label,
  count,
  activeClass,
}: {
  compact?: boolean;
  modelPickerStyle?: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  activeClass: string;
}) {
  const activeVisual = modelPickerStyle
    ? "bg-cyan-600 text-white border-transparent"
    : `${activeClass} border-transparent`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border font-medium transition-colors active:scale-[0.98] motion-reduce:active:scale-100 ${modelPickerStyle
          ? "rounded-lg px-3 py-1.5 text-xs"
          : compact
            ? "rounded-md px-2 py-0.5 text-[11px] leading-tight"
            : "rounded-lg px-3 py-1.5 text-xs"
        } ${active
          ? activeVisual
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
    >
      {label}{" "}
      <span className="tabular-nums opacity-90">({count})</span>
    </button>
  );
}