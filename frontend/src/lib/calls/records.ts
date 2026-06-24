import getNoboxModel from "./get-nobox-model";
import { getItem } from "../utils/store/indexedDb-utils";
import { getRecordMapKey, getRecordStructureMapKey } from "./get-record-and-structure-map";

interface GetRecordsArgs {
    project: any;
    recordSpaceSlug: string;
    populate?: PopulateRecord[];
    id: string;
}

interface PopulateRecord {
    fields: {
        from: string;
        foreignKey: string;
        localKey: string;
        newField: string;
    },
    space: string;
}

interface GetRecordsFromIndexedDbArgs {
    project: any;
    recordSpaceSlug: string;
}

const getRecords = async ({
    project,
    recordSpaceSlug
}: Omit<GetRecordsArgs, "id">) => {
    const { keyGroupModel, rowedModel, recordSpaceStructure } = await getNoboxModel({
        project,
        recordSpaceSlug,
    });

    const records = (keyGroupModel ? await keyGroupModel?.getKeys() : await rowedModel?.find())


    if (!records) {
        return {
            records: [],
            recordSpaceStructure
        };
    }

    return {
        records: Array.isArray(records) ? records : [records],
        recordSpaceStructure
    };
};

export const getRecordsFromIndexedDb = async ({
    project,
    recordSpaceSlug,
}: GetRecordsFromIndexedDbArgs) => {
    const records = await getItem<Record<string, any>>(getRecordMapKey(project.id));

    if (!records) {
        return [];
    }

    return records[recordSpaceSlug];
};

export const getRecordStructureFromIndexedDb = async ({
    project,
    recordSpaceSlug,
}: GetRecordsFromIndexedDbArgs) => {
    const structureMap = await getItem<Record<string, any>>(getRecordStructureMapKey(project.id));
    return structureMap?.[recordSpaceSlug];
};


export const deleteRecordsInRecordSpace = async ({
    project,
    recordSpaceSlug
}: Omit<GetRecordsArgs, "id">) => {
    const { keyGroupModel, rowedModel, recordSpaceStructure } = await getNoboxModel({
        project,
        recordSpaceSlug,
    });

    const recordSpace = (keyGroupModel ? await keyGroupModel?.clear() : await rowedModel?.clear())
};


export const populateRecordInRecordSpace = async ({
    id,
    project,
    recordSpaceSlug,
    populate
}: GetRecordsArgs) => {
    const { rowedModel } = await getNoboxModel({
        project,
        recordSpaceSlug,
    });

    const b = await rowedModel?.findOne({ id }, {
        populate: populate
    })

    return b;
};

export default getRecords;