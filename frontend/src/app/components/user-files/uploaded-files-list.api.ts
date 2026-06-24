import type { CloudFile } from "@/app/components/file/file.interface";
import { getUploadedFiles } from "@/app/components/file/constants";
import { authHttp } from "@/lib/api/auth-client";
import { normalizeUploadFilesList } from "./user-files.utils";

export async function fetchUploadedFilesList(): Promise<{
  ok: boolean;
  files: CloudFile[];
}> {
  try {
    const url = getUploadedFiles({});
    const res = await authHttp.get<unknown>(url);
    if (res.status !== 200) {
      return { ok: false, files: [] };
    }
    return { ok: true, files: normalizeUploadFilesList(res.data) };
  } catch {
    return { ok: false, files: [] };
  }
}
