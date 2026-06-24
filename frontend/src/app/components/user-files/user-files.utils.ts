import type { CloudFile } from "@/app/components/file/file.interface";

export type UserFileCategory =
  | "images"
  | "documents"
  | "spreadsheets"
  | "presentations"
  | "code"
  | "archives"
  | "audio_video"
  | "other";

export const USER_FILE_CATEGORY_ORDER: UserFileCategory[] = [
  "images",
  "documents",
  "spreadsheets",
  "presentations",
  "code",
  "archives",
  "audio_video",
  "other",
];

export const USER_FILE_CATEGORY_LABELS: Record<UserFileCategory, string> = {
  images: "Images",
  documents: "Documents",
  spreadsheets: "Spreadsheets",
  presentations: "Presentations",
  code: "Code & data",
  archives: "Archives",
  audio_video: "Audio & video",
  other: "Other",
};

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "heic",
  "heif",
  "avif",
]);

const DOC_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "odt",
  "rtf",
  "txt",
  "md",
  "markdown",
]);

const SHEET_EXT = new Set(["csv", "xls", "xlsx", "ods", "tsv"]);

const PRES_EXT = new Set(["ppt", "pptx", "odp", "key"]);

const CODE_EXT = new Set([
  "json",
  "xml",
  "yaml",
  "yml",
  "toml",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "cs",
  "php",
  "sql",
  "sh",
  "bash",
  "zsh",
  "env",
  "log",
]);

const ARCHIVE_EXT = new Set([
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
]);

const AV_EXT = new Set([
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
]);

export function getFileExtensionFromCloudFile(file: CloudFile): string {
  const pickExt = (value: string | undefined): string => {
    const v = value?.trim() ?? "";
    if (!v.includes(".")) return "";
    return v.split(".").pop()?.toLowerCase() ?? "";
  };
  return pickExt(file.name) || pickExt(file.originalName);
}

export function isImageCloudFile(file: CloudFile): boolean {
  const ext = getFileExtensionFromCloudFile(file);
  return IMAGE_EXT.has(ext.toLowerCase());
}

export function classifyUserFileCategory(extension: string): UserFileCategory {
  const ext = extension.toLowerCase();
  if (!ext) return "other";
  if (IMAGE_EXT.has(ext)) return "images";
  if (DOC_EXT.has(ext)) return "documents";
  if (SHEET_EXT.has(ext)) return "spreadsheets";
  if (PRES_EXT.has(ext)) return "presentations";
  if (CODE_EXT.has(ext)) return "code";
  if (ARCHIVE_EXT.has(ext)) return "archives";
  if (AV_EXT.has(ext)) return "audio_video";
  return "other";
}

export function buildCloudFileDisplayName(file: CloudFile): string {
  const ext = getFileExtensionFromCloudFile(file);
  const base = (file.originalName || file.name || "file").trim();
  if (!ext) return base;
  const baseLower = base.toLowerCase();
  if (baseLower.endsWith(`.${ext}`)) {
    return base;
  }
  return `${base}.${ext}`;
}

export function formatFileByteSize(bytes: number | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function groupCloudFilesByCategory(
  files: CloudFile[],
): Record<UserFileCategory, CloudFile[]> {
  const empty = USER_FILE_CATEGORY_ORDER.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as Record<UserFileCategory, CloudFile[]>,
  );

  for (const file of files) {
    const ext = getFileExtensionFromCloudFile(file);
    const cat = classifyUserFileCategory(ext);
    empty[cat].push(file);
  }

  for (const key of USER_FILE_CATEGORY_ORDER) {
    empty[key].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return empty;
}

/** Newest `createdAt` first (used for the files browser default ordering). */
export function sortCloudFilesNewestFirst(files: CloudFile[]): CloudFile[] {
  return [...files].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function joinCloudFileS3Links(files: CloudFile[]): string {
  return files.map((f) => f.s3Link).join("\n");
}

export function filterCloudFilesByQuery(
  files: CloudFile[],
  query: string,
): CloudFile[] {
  const q = query.trim().toLowerCase();
  if (!q) return files;
  return files.filter((f) => {
    const display = buildCloudFileDisplayName(f).toLowerCase();
    const orig = (f.originalName || "").toLowerCase();
    const internal = (f.name || "").toLowerCase();
    return display.includes(q) || orig.includes(q) || internal.includes(q);
  });
}

/** Normalize gateway / legacy list payloads to a flat array of file rows. */
function pickSourceConversationId(raw: unknown): string | null | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const camel = o.sourceConversationId;
  const snake = o.source_conversation_id;
  const v = (typeof camel === "string" ? camel : typeof snake === "string" ? snake : null) ?? null;
  return v === "" ? null : v;
}

export function normalizeUploadFilesList(data: unknown): CloudFile[] {
  if (Array.isArray(data)) {
    return data
      .filter(
        (x): x is CloudFile =>
          x != null &&
          typeof x === "object" &&
          "id" in x &&
          typeof (x as CloudFile).id === "string" &&
          "s3Link" in x &&
          typeof (x as CloudFile).s3Link === "string",
      )
      .map((row) => ({
        ...row,
        sourceConversationId:
          pickSourceConversationId(row) ?? row.sourceConversationId ?? null,
      }));
  }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) {
      return normalizeUploadFilesList(d.data);
    }
    if (Array.isArray(d.files)) {
      return normalizeUploadFilesList(d.files);
    }
  }
  return [];
}
