/** Jest stub — never download YOLO/Paddle weights during unit tests. */
export async function ensureModelsDownloaded(_modelsDir?: string): Promise<void> {
  return undefined;
}
