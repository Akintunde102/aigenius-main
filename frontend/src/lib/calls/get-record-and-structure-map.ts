import getRecords from "@/lib/calls/records";
import { storageConstants } from "@/lib/constants";
import { getItem, setItem } from "../utils/store/indexedDb-utils";
import { getStructureMapWithTypeName } from "../gen";

interface UseRecordMapArgs {
    project: any;
    freshCall?: boolean;
}

export const getRecordAndStructureMap = async ({ project, freshCall = false }: UseRecordMapArgs) => {
    if (!freshCall) {
        return getProjectRecordAndStructureMapInStore(project.id);
    }

    return fetchAndStoreProjectRecordAndStructureMap(project);
}

export const getProjectRecordAndStructureMapInStore = async (projectId: string) => {
    const recordMap = await getItem<Record<string, any>>(getRecordMapKey(projectId));
    const recordStructureMap = await getItem<Record<string, any>>(getRecordStructureMapKey(projectId));

    if (!recordMap || !recordStructureMap) {
        throw new Error("An Error Occured");
    }

    return {
        projectRecordMap: recordMap[projectId],
        projectRecordStructureMap: recordStructureMap[projectId]
    }
}


export const fetchAndStoreProjectRecordAndStructureMap = async (project: any) => {
    const recordSpaces = project?.recordSpaces || [];
    const recordAndRecordStructureDetails = await Promise.all(
        recordSpaces.map(async ({ slug: recordSpaceSlug }: any) => {

            const { records, recordSpaceStructure } = await getRecords({
                recordSpaceSlug,
                project,
            });

            return {
                records,
                recordSpaceStructure,
                recordSpaceSlug,
            };
        })
    );

    const projectRecordMap = recordAndRecordStructureDetails.reduce<Record<string, any>>(
        (acc, { recordSpaceSlug, records }) => ({
            ...acc,
            [recordSpaceSlug]: records,
        }),
        {}
    );

    const projectRecordStructureMap = recordAndRecordStructureDetails.reduce<Record<string, any>>(
        (acc, { recordSpaceSlug, recordSpaceStructure }) => ({
            ...acc,
            [recordSpaceSlug]: recordSpaceStructure,
        }),
        {}
    );

    const structureMapWithTypeName = getStructureMapWithTypeName(projectRecordStructureMap);

    const newStructureMap = structureMapWithTypeName;

    await Promise.all([
        setItem(getRecordMapKey(project.id), projectRecordMap),
        setItem(getRecordStructureMapKey(project.id), newStructureMap),
    ]);

    return {
        projectRecordStructureMap: newStructureMap,
        projectRecordMap,
    };
};



export const createRecordSpaceAlias = (projectId: string, recordSpaceSlug: string) => {
    return projectId + "___" + recordSpaceSlug;
}

export const getAllStoreNamesForAllProjects = ({ allProjects }: {
    allProjects: any[];
}) => allProjects.flatMap(({ id: projectId, recordSpaces }) =>
    recordSpaces.map(({ slug }: { slug: string }) => createRecordSpaceAlias(projectId, slug))
);

export const getAllStoreNamesForAProject = (args: {
    project: any;
}) => {
    const { project } = args;
    return project.recordSpaces.map((x: any) => createRecordSpaceAlias(project.id, x.slug));
}


export const getRecordMapKey = (projectId: string) => {
    return storageConstants.PROJECT_RECORD_MAP + "_" + projectId
}

export const getRecordStructureMapKey = (projectId: string) => {
    return storageConstants.PROJECT_RECORD_STRUCTURE_MAP + "_" + projectId
}

export const saveRecordStructureMapInBrowser = async (recordStructureMap: any, projectId: string) => {
    await setItem(getRecordStructureMapKey(projectId), recordStructureMap);
};



