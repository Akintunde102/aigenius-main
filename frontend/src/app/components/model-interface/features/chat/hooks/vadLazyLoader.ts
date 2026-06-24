/**
 * LazyLoader for heavy voice dependencies (MicVAD, ONNX).
 * This keeps the main application bundle light and prevents the browser
 * from evaluating ONNX logic until the user actually starts voice mode.
 */

export async function loadMicVad() {
  console.log('[LazyLoader] Loading @ricky0123/vad-web dynamic chunk...');
  try {
    const vadModule = await import('@ricky0123/vad-web');
    return vadModule.MicVAD;
  } catch (error) {
    console.error('[LazyLoader] Failed to load VAD module', error);
    throw error;
  }
}
