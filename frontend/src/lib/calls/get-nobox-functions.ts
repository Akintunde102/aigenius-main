import {
    Config,
    getFunctions,
} from "@/nobox-client";
import { getLoggedUserToken } from './get-token';
import { LINKS } from '../links';

interface GetNoboxModelArgs {
    project: any;
}

const getNoboxFunctions = async ({
    project,
}: GetNoboxModelArgs) => {
    const token = getLoggedUserToken();
    const endpoint = LINKS.noboxAPIRootUrl;

    console.log('[getNoboxFunctions] Initializing with', {
        projectId: project.id,
        hasToken: !!token,
        endpoint
    });

    if (token) {
        const config: Config = {
            endpoint: LINKS.noboxAPIRootUrl,
            project: project,
            token,
            autoCreate: true,
            mutate: true,
        };

        const NoboxFunctions = getFunctions(config);

        return { ...NoboxFunctions, _noboxConfig: config };
    }
    throw new Error("getNoboxFunctions::Token Not set");
};

export default getNoboxFunctions;
