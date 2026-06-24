const API_LINK = process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL;
if (!API_LINK) {
    throw new Error("Server link not given");
}

export const sendUploadStream = `${API_LINK}/files/upload/stream`;
export const sendUpload = `${API_LINK}/files/upload`;
export const getUploadAccessUsers = `${API_LINK}/files/upload/access`;
export const getFileUrl = (fileId: string) => `${API_LINK}/files/upload/${fileId}`;
export const addFileDescriptionUrl = (fileId: string) => `${API_LINK}/files/upload/${fileId}/add-description`;
export const getFoldersUrl = (type: "all-files" | "folder") => {
    return `${API_LINK}/upload/folders/list?type=${type}`
}

export const addFolderUrl = `${API_LINK}/upload/folders/add`;

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

export const getFolderDetailsUrl = (folderId: string) => `${API_LINK}/upload/folders/${folderId}`

export const shareUploadAccessUrl = (folderId?: string, takerId?: string) => {
    const queryParams: string[] = [];

    if (folderId) {
        queryParams.push(`folderId=${folderId}`);
    }

    if (takerId) {
        queryParams.push(`takerId=${takerId}`);
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return `${API_LINK}/upload/access/share${queryString}`;
}

export const getUploadAccessUrl = (folderId?: string) => {

    if (!folderId) {
        return `${API_LINK}/upload/access/list`;
    }

    return `${API_LINK}/upload/access/list?folderId=${folderId}`;
}

export const deleteFileUrl = (fileId: string) => `${API_LINK}/upload/${fileId}`;

export const listUploadAccessUrl = (folderId?: string) => {

    if (!folderId) {
        return `${API_LINK}/upload/access/list`;
    }

    return `${API_LINK}/upload/access/list?folderId=${folderId}`;
}

export const getUserDetails = (email: string) => `${API_LINK}/user-details?email=${email}`;

export const UPLOAD_TOKEN = "nobox_upload_client_token";

