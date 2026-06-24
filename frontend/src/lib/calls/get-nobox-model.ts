import {
    Config,
    getRowedSchemaCreator,
    getKeyGroupSchemaCreator,
} from "@/nobox-client";
import { findProject, findRecordSpace, createRecordSpaceStructure } from '../gen';
import { getProjectToken } from './get-token';
import { LINKS } from '../links';

interface GetNoboxModelArgs {
    project: any;
    recordSpaceSlug: string;
}


export const getRecordSpaceStructure = ({
    projectId,
    allProjects,
    recordSpaceSlug
}: {
    projectId: string;
    allProjects: any[];
    recordSpaceSlug: string
}) => {

    const project = findProject({
        projects: allProjects,
        projectId
    });

    const recordSpace = findRecordSpace({
        project,
        recordSpaceSlug
    });

    const recordSpaceStructure = createRecordSpaceStructure({
        recordSpace,
        projectSlug: project?.slug
    });

    return recordSpaceStructure;
}



const getNoboxModel = async ({
    project,
    recordSpaceSlug,
}: GetNoboxModelArgs) => {

    const projectSlug = project?.slug;
    const recordSpace = findRecordSpace({
        project,
        recordSpaceSlug
    });

    const recordSpaceType = recordSpace?.type;


    const recordSpaceStructure = createRecordSpaceStructure({
        recordSpace,
        projectSlug: project?.slug,
        forAPICall: true
    });


    const token = getProjectToken(project?.id ?? '');

    if (token) {
        const config: Config = {
            endpoint: LINKS.noboxAPIRootUrl,
            project: projectSlug,
            token,
            autoCreate: false,
            mutate: false,
        };

        return {
            keyGroupModel: recordSpaceType === "key-value" ? getKeyGroupSchemaCreator(config)(recordSpaceStructure) : undefined,
            rowedModel: recordSpaceType !== "key-value" ? getRowedSchemaCreator(config)(recordSpaceStructure) : undefined,
            recordSpaceType,
            recordSpaceStructure
        }
    }
    throw new Error("getNoboxModel::Token Not set");
};

export default getNoboxModel;
