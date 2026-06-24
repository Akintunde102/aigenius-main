import type { CloudFile } from "@/app/components/file/file.interface";
import {
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  filterCloudFilesByQuery,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
  groupCloudFilesByCategory,
  isImageCloudFile,
  joinCloudFileS3Links,
  normalizeUploadFilesList,
  sortCloudFilesNewestFirst,
} from "./user-files.utils";

function file(partial: Partial<CloudFile> & Pick<CloudFile, "id">): CloudFile {
  return {
    name: "x",
    originalName: "x",
    ownedBy: "u1",
    s3Link: "https://example.com/f",
    updatedAt: "2020-01-01",
    createdAt: "2020-01-01",
    ...partial,
  };
}

describe("user-files.utils", () => {
  it("getFileExtensionFromCloudFile reads extension from name", () => {
    expect(
      getFileExtensionFromCloudFile(
        file({ id: "1", name: "report.PDF", originalName: "report" }),
      ),
    ).toBe("pdf");
  });

  it("getFileExtensionFromCloudFile falls back to originalName", () => {
    expect(
      getFileExtensionFromCloudFile(
        file({ id: "2", name: "abc", originalName: "photo.JPEG" }),
      ),
    ).toBe("jpeg");
  });

  it("isImageCloudFile detects image types", () => {
    expect(
      isImageCloudFile(file({ id: "1", name: "a.png", originalName: "a" })),
    ).toBe(true);
    expect(
      isImageCloudFile(file({ id: "2", name: "b.pdf", originalName: "b" })),
    ).toBe(false);
  });

  it("classifyUserFileCategory maps extensions", () => {
    expect(classifyUserFileCategory("png")).toBe("images");
    expect(classifyUserFileCategory("pdf")).toBe("documents");
    expect(classifyUserFileCategory("csv")).toBe("spreadsheets");
    expect(classifyUserFileCategory("pptx")).toBe("presentations");
    expect(classifyUserFileCategory("json")).toBe("code");
    expect(classifyUserFileCategory("zip")).toBe("archives");
    expect(classifyUserFileCategory("mp3")).toBe("audio_video");
    expect(classifyUserFileCategory("weird")).toBe("other");
  });

  it("buildCloudFileDisplayName avoids double extension", () => {
    expect(
      buildCloudFileDisplayName(
        file({ id: "1", name: "a.png", originalName: "a.png" }),
      ),
    ).toBe("a.png");
    expect(
      buildCloudFileDisplayName(
        file({ id: "2", name: "b.png", originalName: "b" }),
      ),
    ).toBe("b.png");
  });

  it("formatFileByteSize handles edge cases", () => {
    expect(formatFileByteSize(undefined)).toBe("—");
    expect(formatFileByteSize(0)).toBe("—");
    expect(formatFileByteSize(512)).toBe("512 B");
    expect(formatFileByteSize(2048)).toBe("2.0 KB");
    expect(formatFileByteSize(1024 * 1024)).toBe("1.00 MB");
  });

  it("groupCloudFilesByCategory buckets and sorts newest first", () => {
    const older = file({
      id: "o",
      name: "a.png",
      originalName: "a",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    const newer = file({
      id: "n",
      name: "b.png",
      originalName: "b",
      createdAt: "2021-01-01T00:00:00.000Z",
    });
    const grouped = groupCloudFilesByCategory([older, newer]);
    expect(grouped.images.map((x) => x.id)).toEqual(["n", "o"]);
  });

  it("filterCloudFilesByQuery is case-insensitive", () => {
    const files = [
      file({
        id: "1",
        name: "Notes.pdf",
        originalName: "Notes",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ];
    expect(filterCloudFilesByQuery(files, "notes")).toHaveLength(1);
    expect(filterCloudFilesByQuery(files, "PDF")).toHaveLength(1);
    expect(filterCloudFilesByQuery(files, "nope")).toHaveLength(0);
  });

  it("normalizeUploadFilesList unwraps nested data", () => {
    const one = file({ id: "a", name: "x.png", createdAt: "2020-01-01" });
    const withConv = { ...one, sourceConversationId: null as string | null };
    expect(normalizeUploadFilesList([one])).toEqual([withConv]);
    expect(normalizeUploadFilesList({ data: [one] })).toEqual([withConv]);
    expect(normalizeUploadFilesList({ files: [one] })).toEqual([withConv]);
    expect(normalizeUploadFilesList(null)).toEqual([]);
  });

  it("sortCloudFilesNewestFirst orders by createdAt descending", () => {
    const older = file({
      id: "old",
      name: "a.png",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    const mid = file({
      id: "mid",
      name: "b.png",
      createdAt: "2021-06-01T00:00:00.000Z",
    });
    const newest = file({
      id: "new",
      name: "c.png",
      createdAt: "2023-01-01T00:00:00.000Z",
    });
    expect(sortCloudFilesNewestFirst([older, newest, mid]).map((x) => x.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("joinCloudFileS3Links joins with newlines", () => {
    const a = file({ id: "a", s3Link: "https://example.com/a" });
    const b = file({ id: "b", s3Link: "https://example.com/b" });
    expect(joinCloudFileS3Links([a, b])).toBe(
      "https://example.com/a\nhttps://example.com/b",
    );
  });
});
