const API_LINK = process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL;
if (!API_LINK) {
    throw new Error("Server link not given");
}

const UPLOAD_GATEWAY = `${API_LINK}/gateway/*/upload`;

export const sendUploadStream = `${UPLOAD_GATEWAY}/stream`;
export const sendUpload = UPLOAD_GATEWAY;
export const getUploadAccessUsers = `${UPLOAD_GATEWAY}/access/list`;
export const getFileUrl = (fileId: string) => `${UPLOAD_GATEWAY}/${fileId}`;
export const addFileDescriptionUrl = (fileId: string) => `${UPLOAD_GATEWAY}/${fileId}/add-description`;
export const getFoldersUrl = (type: "all-files" | "folder") => {
    return `${UPLOAD_GATEWAY}/folders/list?type=${type}`
}

export const addFolderUrl = `${UPLOAD_GATEWAY}/folders/add`;

export const getUploadedFiles = (args: { folderId?: string, userId?: string }) => {

    const userId = args?.userId;
    const folderId = args?.folderId;

    // Nest UploadGatewayController list route (path contains literal "gateway/*/upload").
    let link = `${API_LINK}/gateway/*/upload/files`;

    if (userId) {
        link += `?userId=${userId}`;
    }

    if (folderId) {
        link += `${userId ? "&" : "?"}folderId=${folderId}`;
    }

    return link;
}

export const getFolderDetailsUrl = (folderId: string) => `${UPLOAD_GATEWAY}/folders/${folderId}`

export const shareUploadAccessUrl = (folderId?: string, takerId?: string) => {
    const queryParams: string[] = [];

    if (folderId) {
        queryParams.push(`folderId=${folderId}`);
    }

    if (takerId) {
        queryParams.push(`takerId=${takerId}`);
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return `${UPLOAD_GATEWAY}/access/share${queryString}`;
}

export const getUploadAccessUrl = (folderId?: string) => {

    if (!folderId) {
        return `${UPLOAD_GATEWAY}/access/list`;
    }

    return `${UPLOAD_GATEWAY}/access/list?folderId=${folderId}`;
}

export const deleteFileUrl = (fileId: string) => `${UPLOAD_GATEWAY}/${fileId}`;

export const listUploadAccessUrl = (folderId?: string) => {

    if (!folderId) {
        return `${UPLOAD_GATEWAY}/access/list`;
    }

    return `${UPLOAD_GATEWAY}/access/list?folderId=${folderId}`;
}

export const getUserDetails = (email: string) => `${API_LINK}/user-details?email=${email}`;

export const UPLOAD_TOKEN = "nobox_upload_client_token";

