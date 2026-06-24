import { getFoldersUrl } from "@/app/components/file/constants";
import { authHttp } from "@/lib/api/auth-client";

export const getFolders = async (type: "all-files" | "folder" = "folder") => {
    const folders = await authHttp.get(getFoldersUrl(type));
    return folders.data;
};
