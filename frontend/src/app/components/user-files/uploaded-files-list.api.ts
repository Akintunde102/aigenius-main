import type { CloudFile } from "@/app/components/file/file.interface";
import { authHttp } from "@/lib/api/auth-client";
import { gatewayUploadFilesListUrl } from "@/lib/api/gateway-upload-paths";
import { resolveGatewayApiBaseCandidates } from "@/lib/api/resolve-gateway-api-root";
import { normalizeUploadFilesList } from "./user-files.utils";

export async function fetchUploadedFilesList(): Promise<{
  ok: boolean;
  files: CloudFile[];
}> {
  const bases = await resolveGatewayApiBaseCandidates();
  if (bases.length === 0) {
    return { ok: false, files: [] };
  }

  let lastError: unknown;
  for (const apiRoot of bases) {
    try {
      const url = gatewayUploadFilesListUrl(apiRoot);
      const res = await authHttp.get<unknown>(url);
      if (res.status !== 200) {
        continue;
      }
      return { ok: true, files: normalizeUploadFilesList(res.data) };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("[user-files] list fetch failed across API bases", lastError);
  }
  return { ok: false, files: [] };
}
