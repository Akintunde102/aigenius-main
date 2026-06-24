import { renderHook, act, waitFor } from "@testing-library/react";
import { fetchUploadedFilesList } from "./uploaded-files-list.api";
import { useUploadedFilesList } from "./useUploadedFilesList";

jest.mock("./uploaded-files-list.api", () => ({
  fetchUploadedFilesList: jest.fn(),
}));

const mockFetch = fetchUploadedFilesList as jest.MockedFunction<
  typeof fetchUploadedFilesList
>;

describe("useUploadedFilesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads files on mount when not skipped", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      files: [
        {
          id: "1",
          name: "a.png",
          originalName: "a",
          ownedBy: "u",
          s3Link: "https://example.com/a.png",
          updatedAt: "2020-01-01",
          createdAt: "2020-01-01",
        },
      ],
    });

    const { result } = renderHook(() => useUploadedFilesList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.fetchError).toBeNull();
    expect(mockFetch).toHaveBeenCalled();
  });

  it("sets error when fetch fails with no prior data", async () => {
    mockFetch.mockResolvedValue({ ok: false, files: [] });

    const { result } = renderHook(() => useUploadedFilesList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fetchError).toBe("Could not load your files.");
    expect(result.current.files).toEqual([]);
  });

  it("does not fetch when skip is true", () => {
    const { result } = renderHook(() => useUploadedFilesList({ skip: true }));

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("silent refresh keeps prior files on failure", async () => {
    const row = {
      id: "1",
      name: "a.png",
      originalName: "a",
      ownedBy: "u",
      s3Link: "https://example.com/a.png",
      updatedAt: "2020-01-01",
      createdAt: "2020-01-01",
    };
    mockFetch.mockResolvedValueOnce({ ok: true, files: [row] });
    mockFetch.mockResolvedValueOnce({ ok: false, files: [] });

    const { result } = renderHook(() => useUploadedFilesList());

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh({ silent: true });
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.fetchError).toBe("Could not load your files.");
  });
});
