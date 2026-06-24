import axios from "axios";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
  setFavorites,
  toggleFavorite,
  checkIsFavorite,
  FavoritesApiError,
} from "../favoritesApi";

const mockAuthGet = jest.fn();
const mockAuthPost = jest.fn();
const mockAuthPut = jest.fn();
const mockAuthDelete = jest.fn();

// Mock axios with all methods and isAxiosError
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  isAxiosError: jest.fn(),
}));

jest.mock("@/lib/api/auth-client", () => ({
  authHttp: {
    get: (...args: any[]) => mockAuthGet(...args),
    post: (...args: any[]) => mockAuthPost(...args),
    put: (...args: any[]) => mockAuthPut(...args),
    delete: (...args: any[]) => mockAuthDelete(...args),
  },
}));

jest.mock("@/lib/links", () => ({
  LINKS: {
    noboxAPIRootUrl: "https://api.test",
  },
}));

const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

describe("favoritesApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up isAxiosError mock to return false for generic errors
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
  });

  describe("fetchFavorites", () => {
    it("should fetch and return array of favorite model IDs and sequence flag", async () => {
      const mockFavorites = ["model-1", "model-2", "model-3"];
      mockAuthGet.mockResolvedValue({ 
        data: { favorites: mockFavorites, hasSeededFavorites: true } 
      });

      const result = await fetchFavorites();

      expect(mockAuthGet).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toEqual({ favorites: mockFavorites, hasSeededFavorites: true });
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthGet.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(fetchFavorites()).rejects.toThrow(
        "Failed to fetch favorites from backend",
      );
    });
  });

  describe("addFavorite", () => {
    it("should add a favorite and return true on success", async () => {
      mockAuthPost.mockResolvedValue({
        data: { success: true },
      });

      const result = await addFavorite("model-abc");

      expect(mockAuthPost).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites",
        { modelId: "model-abc" },
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toBe(true);
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthPost.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(addFavorite("model-abc")).rejects.toThrow(
        "Failed to add favorite to backend",
      );
    });
  });

  describe("removeFavorite", () => {
    it("should remove a favorite and return true on success", async () => {
      mockAuthDelete.mockResolvedValue({
        data: { success: true },
      });

      const result = await removeFavorite("model-abc");

      expect(mockAuthDelete).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites/model-abc",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toBe(true);
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthDelete.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(removeFavorite("model-abc")).rejects.toThrow(
        "Failed to remove favorite from backend",
      );
    });

    it("should URL encode model IDs with special characters", async () => {
      mockAuthDelete.mockResolvedValue({
        data: { success: true },
      });

      await removeFavorite("model/with/slashes");

      expect(mockAuthDelete).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites/model%2Fwith%2Fslashes",
        expect.any(Object),
      );
    });
  });

  describe("setFavorites", () => {
    it("should set favorites and return true on success", async () => {
      mockAuthPut.mockResolvedValue({
        data: { success: true },
      });

      const result = await setFavorites(["model-1", "model-2"]);

      expect(mockAuthPut).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites",
        { modelIds: ["model-1", "model-2"] },
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toBe(true);
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthPut.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(setFavorites(["model-1"])).rejects.toThrow(
        "Failed to set favorites in backend",
      );
    });
  });

  describe("toggleFavorite", () => {
    it("should toggle favorite and return new status on success", async () => {
      mockAuthPost.mockResolvedValue({
        data: { success: true, isFavorite: true },
      });

      const result = await toggleFavorite("model-abc");

      expect(mockAuthPost).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites/toggle",
        { modelId: "model-abc" },
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toBe(true);
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthPost.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(toggleFavorite("model-abc")).rejects.toThrow(
        "Failed to toggle favorite in backend",
      );
    });
  });

  describe("checkIsFavorite", () => {
    it("should return true when model is favorite", async () => {
      mockAuthGet.mockResolvedValue({
        data: { isFavorite: true },
      });

      const result = await checkIsFavorite("model-abc");

      expect(mockAuthGet).toHaveBeenCalledWith(
        "https://api.test/gateway/*/user-favorites/check/model-abc",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result).toBe(true);
    });

    it("should return false when model is not favorite", async () => {
      mockAuthGet.mockResolvedValue({
        data: { isFavorite: false },
      });

      const result = await checkIsFavorite("model-xyz");

      expect(result).toBe(false);
    });

    it("should throw FavoritesApiError on error", async () => {
      mockAuthGet.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(checkIsFavorite("model-abc")).rejects.toThrow(
        "Failed to check favorite status in backend",
      );
    });
  });
});
