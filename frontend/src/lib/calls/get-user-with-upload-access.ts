import { listUploadAccessUrl } from "@/app/components/file/constants";
import { authHttp } from "@/lib/api/auth-client";

export const getUsersWithAccess = async (folderId?: string) => {
    const res = await authHttp.get(`${listUploadAccessUrl(folderId)}`);

    return res;
};
