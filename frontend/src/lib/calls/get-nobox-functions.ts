import {
    Config,
    getFunctions,
} from "@/nobox-client";
import { resolveGatewayApiRootUrl } from '@/lib/api/resolve-gateway-api-root';
import { getLoggedUserToken } from './get-token';

interface GetNoboxModelArgs {
    project: any;
}

const getNoboxFunctions = async ({
    project,
}: GetNoboxModelArgs) => {
    const token = getLoggedUserToken();
    const endpoint = await resolveGatewayApiRootUrl();

    console.log('[getNoboxFunctions] Initializing with', {
        projectId: project.id,
        hasToken: !!token,
        endpoint
    });

    if (token) {
        const config: Config = {
            endpoint,
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
