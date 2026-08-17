import { getApiRootUrl } from './api-root';

export interface Links {
    githubLogin: string;
    googleLogin: string;
    /** @deprecated Use aigeniusAPIRootUrl */
    noboxAPIRootUrl: string;
    aigeniusAPIRootUrl: string;
    /** @deprecated Use aigeniusGatewayRootUrl */
    noboxGatewayRootUrl: string;
    aigeniusGatewayRootUrl: string;
    internalPages: {
        home: string;
        login: {
            github: string;
        },
        error: {
            main: string
        }
    }
}

const apiRoot = getApiRootUrl();

export const LINKS: Links = {
    githubLogin: `${apiRoot}/auth/_/github`,
    googleLogin: `${apiRoot}/auth/_/google`,
    noboxAPIRootUrl: apiRoot,
    aigeniusAPIRootUrl: apiRoot,
    noboxGatewayRootUrl: `${apiRoot}/gateway/*`,
    aigeniusGatewayRootUrl: `${apiRoot}/gateway/*`,
    internalPages: {
        home: "/",
        login: {
            github: "/login"
        },
        error: {
            main: "/error"
        }
    }
}
