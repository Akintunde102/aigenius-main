import axios from "axios";
import { authHttp } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";

const FAVORITES_ENDPOINT = `${LINKS.noboxAPIRootUrl}/gateway/*/user-favorites`;

/**
 * Custom error class for favorites API failures
 */
export class FavoritesApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
  ) {
    super(message);
    this.name = "FavoritesApiError";
  }
}

/**
 * Fetch all favorite model IDs from the backend and migration status
 * @throws {FavoritesApiError} When the request fails
 */
export async function fetchFavorites(): Promise<{ favorites: string[]; hasSeededFavorites: boolean }> {
  try {
    const response = await authHttp.get<{ favorites: string[]; hasSeededFavorites: boolean }>(FAVORITES_ENDPOINT, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data || { favorites: [], hasSeededFavorites: false };
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to fetch favorites: ${error.response.status} ${error.response.statusText}`
        : "Failed to fetch favorites from backend";
    throw new FavoritesApiError(message, "FETCH_ERROR", "fetchFavorites");
  }
}

/**
 * Add a model to favorites
 * @throws {FavoritesApiError} When the request fails
 */
export async function addFavorite(modelId: string): Promise<boolean> {
  try {
    await authHttp.post(
      FAVORITES_ENDPOINT,
      { modelId },
      { headers: { "Content-Type": "application/json" } },
    );
    return true;
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to add favorite: ${error.response.status} ${error.response.statusText}`
        : "Failed to add favorite to backend";
    throw new FavoritesApiError(message, "ADD_ERROR", "addFavorite");
  }
}

/**
 * Remove a model from favorites
 * @throws {FavoritesApiError} When the request fails
 */
export async function removeFavorite(modelId: string): Promise<boolean> {
  try {
    await authHttp.delete(`${FAVORITES_ENDPOINT}/${encodeURIComponent(modelId)}`, {
      headers: { "Content-Type": "application/json" },
    });
    return true;
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to remove favorite: ${error.response.status} ${error.response.statusText}`
        : "Failed to remove favorite from backend";
    throw new FavoritesApiError(message, "REMOVE_ERROR", "removeFavorite");
  }
}

/**
 * Bulk set favorites (replaces all existing favorites)
 * @throws {FavoritesApiError} When the request fails
 */
export async function setFavorites(modelIds: string[]): Promise<boolean> {
  try {
    await authHttp.put(
      FAVORITES_ENDPOINT,
      { modelIds },
      { headers: { "Content-Type": "application/json" } },
    );
    return true;
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to set favorites: ${error.response.status} ${error.response.statusText}`
        : "Failed to set favorites in backend";
    throw new FavoritesApiError(message, "SET_ERROR", "setFavorites");
  }
}

/**
 * Toggle a model's favorite status
 * @throws {FavoritesApiError} When the request fails
 */
export async function toggleFavorite(modelId: string): Promise<boolean | null> {
  try {
    const response = await authHttp.post<{
      success: boolean;
      isFavorite: boolean;
    }>(
      `${FAVORITES_ENDPOINT}/toggle`,
      { modelId },
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data.isFavorite;
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to toggle favorite: ${error.response.status} ${error.response.statusText}`
        : "Failed to toggle favorite in backend";
    throw new FavoritesApiError(message, "TOGGLE_ERROR", "toggleFavorite");
  }
}

/**
 * Check if a model is in favorites
 * @throws {FavoritesApiError} When the request fails
 */
export async function checkIsFavorite(modelId: string): Promise<boolean> {
  try {
    const response = await authHttp.get<{ isFavorite: boolean }>(
      `${FAVORITES_ENDPOINT}/check/${encodeURIComponent(modelId)}`,
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data.isFavorite;
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response
        ? `Failed to check favorite status: ${error.response.status} ${error.response.statusText}`
        : "Failed to check favorite status in backend";
    throw new FavoritesApiError(message, "CHECK_ERROR", "checkIsFavorite");
  }
}
