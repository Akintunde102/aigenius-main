import { storageConstants } from "../constants";
import { getAccessToken } from "../api/auth-client";
import { storage } from "../utils/store";

export const getProjectToken = (projectId: string) => {

    const sharedProjectTokenStore = storage(storageConstants.NOBOX_SHARED_PROJECT_TOKENS);

    const sharedProjectTokens = sharedProjectTokenStore.getObject<{ projectId: string, projectToken: string }[]>();

    const sharedProjectToken = sharedProjectTokens && sharedProjectTokens.find((sharedProjectToken) => {
        return sharedProjectToken.projectId === projectId
    });

    return sharedProjectToken?.projectToken || storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
}

export const getLoggedUserToken = () => {
    return storage(storageConstants.NOBOX_CLIENT_TOKEN).getString() 
        || storage(storageConstants.NOBOX_TOKEN).getString();
}

export const getJWTToken = () => {
    return getAccessToken();
}
