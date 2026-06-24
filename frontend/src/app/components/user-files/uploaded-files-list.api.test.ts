import type { CloudFile } from "@/app/components/file/file.interface";
import { authHttp } from "@/lib/api/auth-client";
import { fetchUploadedFilesList } from "./uploaded-files-list.api";

jest.mock("@/lib/api/auth-client", () => ({
  authHttp: {
    get: jest.fn(),
  },
}));

jest.mock("@/app/components/file/constants", () => ({
  getUploadedFiles: jest.fn(() => "/uploaded-files"),
}));

const authGet = authHttp.get as jest.MockedFunction<typeof authHttp.get>;

describe("fetchUploadedFilesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ok and normalized files on 200", async () => {
    const row: CloudFile = {
      id: "1",
      name: "x.png",
      originalName: "x",
      ownedBy: "u",
      s3Link: "https://cdn.example.com/x.png",
      updatedAt: "2020-01-01",
      createdAt: "2020-01-01",
    };
    authGet.mockResolvedValue({ status: 200, data: [row] });

    const result = await fetchUploadedFilesList();

    expect(result.ok).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].id).toBe("1");
  });

  it("returns not ok on non-200", async () => {
    authGet.mockResolvedValue({ status: 500, data: null });

    const result = await fetchUploadedFilesList();

    expect(result.ok).toBe(false);
    expect(result.files).toEqual([]);
  });

  it("returns not ok when request throws", async () => {
    authGet.mockRejectedValue(new Error("network"));

    const result = await fetchUploadedFilesList();

    expect(result.ok).toBe(false);
    expect(result.files).toEqual([]);
  });
});
