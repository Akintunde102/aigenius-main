import type { DesktopChatScreenshotPayload } from "@/lib/utils/desktop-runtime";

/** Build a {@link File} from main-process window capture (same path as manual image upload). */
export function fileFromDesktopChatScreenshotPayload(
  payload: DesktopChatScreenshotPayload,
): File {
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const mime = payload.mimeType?.trim() || "image/png";
  return new File([bytes], payload.basename || "aigenius-screenshot.png", {
    type: mime,
  });
}

export function filesFromDesktopChatScreenshotPayloads(
  payloads: DesktopChatScreenshotPayload[],
): File[] {
  return payloads.map(fileFromDesktopChatScreenshotPayload);
}
