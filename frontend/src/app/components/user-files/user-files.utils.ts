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

export function stripStorageKeyPrefix(name: string): string {
  let cleaned = name.trim();
  if (cleaned.includes("/")) {
    cleaned = cleaned.split("/").pop() ?? cleaned;
  }
  // Matches standard UUIDv4 followed by '_' or '-' prefix
  const stripped = cleaned.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]/i,
    "",
  );
  const withoutExt = stripped.includes(".")
    ? stripped.slice(0, stripped.lastIndexOf("."))
    : stripped;
  if (withoutExt.trim().length > 0) {
    return stripped;
  }
  return cleaned;
}

export function getFileExtensionFromCloudFile(file: CloudFile): string {
  const pickExt = (value: string | undefined): string => {
    if (!value) return "";
    const clean = value.split("?")[0].split("#")[0].trim();
    const lastSlash = clean.lastIndexOf("/");
    const basename = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
    if (!basename.includes(".")) return "";
    const ext = basename.split(".").pop()?.toLowerCase() ?? "";
    if (/^[a-z0-9]{1,10}$/.test(ext)) {
      return ext;
    }
    return "";
  };
  return pickExt(file.name) || pickExt(file.originalName) || pickExt(file.s3Link);
}

export function isImageCloudFile(file: CloudFile): boolean {
  const ext = getFileExtensionFromCloudFile(file);
  if (IMAGE_EXT.has(ext.toLowerCase())) return true;
  if (file.s3Link) {
    const cleanUrl = file.s3Link.split("?")[0].split("#")[0].toLowerCase();
    if (cleanUrl.includes("/image/upload/") || cleanUrl.includes("/images/")) {
      return true;
    }
  }
  return false;
}

export function isMarkdownCloudFile(file: CloudFile): boolean {
  const ext = getFileExtensionFromCloudFile(file);
  return ext === "md" || ext === "markdown";
}

export function classifyUserFileCategory(
  extension: string,
  s3Link?: string,
): UserFileCategory {
  const ext = extension.toLowerCase();
  if (IMAGE_EXT.has(ext)) return "images";
  if (DOC_EXT.has(ext)) return "documents";
  if (SHEET_EXT.has(ext)) return "spreadsheets";
  if (PRES_EXT.has(ext)) return "presentations";
  if (CODE_EXT.has(ext)) return "code";
  if (ARCHIVE_EXT.has(ext)) return "archives";
  if (AV_EXT.has(ext)) return "audio_video";
  if (s3Link) {
    const lower = s3Link.split("?")[0].split("#")[0].toLowerCase();
    if (lower.includes("/image/upload/") || lower.includes("/images/")) return "images";
    if (lower.includes("/video/upload/") || lower.includes("/videos/")) return "audio_video";
  }
  return "other";
}

export function buildCloudFileDisplayName(file: CloudFile): string {
  const ext = getFileExtensionFromCloudFile(file);

  let raw = "";
  const orig = file.originalName?.trim();
  const name = file.name?.trim();

  if (orig && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]/i.test(orig)) {
    raw = orig;
  } else if (orig) {
    raw = stripStorageKeyPrefix(orig);
  } else if (name) {
    raw = stripStorageKeyPrefix(name);
  } else if (file.s3Link) {
    const fromUrl = file.s3Link.split("?")[0].split("#")[0].split("/").pop();
    if (fromUrl) raw = stripStorageKeyPrefix(decodeURIComponent(fromUrl));
  }

  let base = (raw || "file").trim();
  base = stripStorageKeyPrefix(base);

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
    const cat = classifyUserFileCategory(ext, file.s3Link);
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

const ATTACHABLE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  md: "text/markdown",
  markdown: "text/markdown",
  pdf: "application/pdf",
  xml: "application/xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  m4a: "audio/m4a",
  aac: "audio/aac",
  flac: "audio/flac",
  mp4: "audio/mp4",
};

export function inferMimeTypeFromCloudFile(file: CloudFile): string | undefined {
  const ext = getFileExtensionFromCloudFile(file);
  return ext ? ATTACHABLE_MIME_BY_EXT[ext] : undefined;
}

export function isAttachableCloudFile(file: CloudFile): boolean {
  const ext = getFileExtensionFromCloudFile(file);
  if (!ext) return false;
  return ext in ATTACHABLE_MIME_BY_EXT;
}

export function inferPreviewTypeFromCloudFile(
  file: CloudFile,
): 'image' | 'pdf' | 'video' | 'audio' | 'code' | 'folder' | 'unsupported' {
  const ext = getFileExtensionFromCloudFile(file).toLowerCase();
  if (!ext) return 'unsupported';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogg'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (
    DOC_EXT.has(ext) ||
    SHEET_EXT.has(ext) ||
    PRES_EXT.has(ext) ||
    CODE_EXT.has(ext) ||
    [
      'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'yaml', 'yml',
      'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass', 'less',
      'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'cs', 'php', 'sql',
      'sh', 'bash', 'zsh', 'env', 'log', 'ini', 'conf', 'c', 'cpp', 'h', 'hpp',
    ].includes(ext)
  ) {
    return 'code';
  }
  return 'unsupported';
}

