/** Nest upload gateway paths (literal gateway/wildcard/upload segment). */

export function gatewayUploadFilesListUrl(
  apiRoot: string,
  args: { folderId?: string; userId?: string } = {},
): string {
  const base = `${apiRoot.replace(/\/+$/, "")}/gateway/*/upload/files`;
  const params = new URLSearchParams();
  if (args.userId) {
    params.set("userId", args.userId);
  }
  if (args.folderId) {
    params.set("folderId", args.folderId);
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function gatewayUploadStreamUrl(apiRoot: string): string {
  return `${apiRoot.replace(/\/+$/, "")}/gateway/*/upload/stream`;
}

export function gatewayUploadUrl(apiRoot: string): string {
  return `${apiRoot.replace(/\/+$/, "")}/gateway/*/upload`;
}
