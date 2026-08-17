"use client";

import {
  Archive,
  Clapperboard,
  Code2,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Presentation,
  Table2,
} from "lucide-react";
import type { UserFileCategory } from "../user-files.utils";


export function categoryIcon(cat: UserFileCategory, size: "md" | "sm" | "lg" = "md") {
  const c =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  switch (cat) {
    case "images":
      return <ImageIcon className={`${c} text-emerald-600`} strokeWidth={1.5} />;
    case "documents":
      return <FileText className={`${c} text-sky-600`} strokeWidth={1.5} />;
    case "spreadsheets":
      return <Table2 className={`${c} text-amber-600`} strokeWidth={1.5} />;
    case "presentations":
      return <Presentation className={`${c} text-rose-600`} strokeWidth={1.5} />;
    case "code":
      return <Code2 className={`${c} text-slate-600`} strokeWidth={1.5} />;
    case "archives":
      return <Archive className={`${c} text-orange-600`} strokeWidth={1.5} />;
    case "audio_video":
      return <Clapperboard className={`${c} text-lime-700`} strokeWidth={1.5} />;
    default:
      return <FileQuestion className={`${c} text-gray-600`} strokeWidth={1.5} />;
  }
}