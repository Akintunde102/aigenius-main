import _ from 'lodash';
import { CompatibleStructureFieldType, FindProjectArgs, PagePathNames, PageTypes } from './types';
import { storageConstants } from './constants';
import { storage } from './utils/store';
import { Space, SpaceWebhooks } from '../nobox-client';
import { CloudFile } from '@/app/components/file/file.interface';

export const convertTypeToTypeName = (type: any) => {
    switch (type) {
        case Number:
            return "Number";
        case String:
            return "Text";
        case Boolean:
            return "Boolean";
        case Array:
            return "Array";
        case Object:
            return "Object";
        default:
            return type;
    }
}


const convertTypeToTypeConstructor = (type: CompatibleStructureFieldType) => {
    switch (type) {
        case "TEXT":
            return String;
        case "NUMBER":
            return Number;
        case "BOOLEAN":
            return Boolean;
        case "ARRAY":
            return Array;
        default:
            return String;
    }
}



export const findProject = ({ projectId, projects }: FindProjectArgs) => {
    const _projects = projects || getAllProjectsFromStore();
    const project = _projects?.find(project => project.id === projectId);
    return project;
}

const getAllProjectsFromStore = () => {
    const projectStore = storage(storageConstants.NOBOX_DATA);
    const sharedProjectStore = storage(storageConstants.NOBOX_SHARED_DATA);
    const allProjects = [...(projectStore.getObject() || []) as any[], ...(sharedProjectStore.getObject() || []) as any[]];
    return allProjects;
};


export const findRecordSpace = ({ project, recordSpaceSlug }: any) => {
    const recordSpace = project?.recordSpaces?.find(
        (recordSpace: any) => recordSpace.slug === recordSpaceSlug
    );
    return recordSpace;
};


export const getStructureMapWithTypeName = (structureMap: Record<string, any>) => {
    const keys = Object.keys(structureMap);

    const newStructureMap: any = {};

    for (let i = 0; i < keys.length; i++) {
        const eachKey = keys[i];
        const structure = structureMap[eachKey];
        const { structure: fieldStructure } = structure;


        const fieldStructureKeys = Object.keys(fieldStructure);

        const newStructure: any = {
            ...structure,
            structure: {}
        };

        for (let i = 0; i < fieldStructureKeys.length; i++) {
            const fieldStructureKey = fieldStructureKeys[i];
            const presentFieldStructure = fieldStructure[fieldStructureKey];

            newStructure["structure"][fieldStructureKey] = {
                ...presentFieldStructure,
                type: convertTypeToTypeName(presentFieldStructure.type)
            };
        }
        newStructureMap[eachKey] = newStructure
    }


    return newStructureMap;
}


export const utcTime = () => {
    return (new Date()).getTime();
}

export const createRecordSpaceStructure = (args: {
    recordSpace: {
        id: string;
        name: string;
        description: string;
        slug: string;
        webhooks: SpaceWebhooks;
        hydratedRecordFields: any[]
    },
    projectSlug: string;
    forAPICall?: boolean
}) => {
    const { recordSpace, forAPICall } = args;

    const { hydratedRecordFields: fieldDetails } = recordSpace;

    const recordSpaceStructure: Space<any> = {
        space: recordSpace?.slug,
        description: recordSpace?.description,
        structure: {},
        webhooks: recordSpace?.webhooks
    };

    if (fieldDetails && fieldDetails.length) {
        for (const field of fieldDetails) {
            const { name, description, type, unique, required, comment, hashed, defaultValue } = field;
            const unitStructure = _.omitBy(
                {
                    required,
                    unique,
                    description,
                    comment,
                    hashed,
                    type: forAPICall ? convertTypeToTypeConstructor(type) : type,
                    name,
                    defaultValue
                },
                _.isNil
            );

            if (name) {
                (recordSpaceStructure.structure as any)[name] = unitStructure;
            }
        }
    }
    return recordSpaceStructure;
}

export const getProjectIdFromPathName = (pathname: string) => {
    const pathArr = pathname.split("/");

    const [, secondPathName, thirdPathName, fourthPathName] = pathArr;

    if (secondPathName === PagePathNames.recordSpacePathName && Boolean(thirdPathName)) {
        return {
            projectId: thirdPathName,
            pageType: PageTypes.recordSpacesList
        };
    }

    if (secondPathName === PagePathNames.recordsPathName && Boolean(thirdPathName) && Boolean(fourthPathName)) {
        return {
            projectId: thirdPathName,
            recordSpaceSlug: fourthPathName,
            pageType: PageTypes.recordsList
        };
    }

    return {};
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

export const moveKeysToEnd = <T>(array: T[], keysToMove: T[]): T[] => {
    let removedKeys: T[] = [];

    keysToMove.forEach(key => {
        const index = array.indexOf(key);
        if (index !== -1) {
            removedKeys.push(array.splice(index, 1)[0]);
        }
    });

    array.push(...removedKeys);
    return array;
};

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function waitFor(delay: number) {
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    });
}

export const consideredImageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

export const imageIsPresentInFiles = (files: CloudFile[]) => files.some((file) => {
    const extension = file.name.split('.').pop();
    if (!extension) return false;
    return consideredImageExtensions.includes(extension);
});

export const numberOfImagesPresentInFiles = (files: CloudFile[]) => {
    return files.filter((file) => {
        const extension = file.name.split('.').pop();
        if (!extension) return false;
        return consideredImageExtensions.includes(extension);
    }).length
}
