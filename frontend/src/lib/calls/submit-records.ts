import getNoboxModel from "./get-nobox-model";

interface SubmitRecordsArgs {
    project: any;
    recordSpaceSlug: string;
    record: Record<string, string> | Record<string, any>[];
}

const submitRecords = async ({
    project,
    recordSpaceSlug,
    record
}: SubmitRecordsArgs) => {
    const { keyGroupModel, rowedModel, recordSpaceStructure } = await getNoboxModel({
        project,
        recordSpaceSlug,
    });

    const records = Array.isArray(record)
        ? await rowedModel?.insert(record)
        : keyGroupModel
            ? await keyGroupModel.setKeys(record)
            : await rowedModel?.insertOne(record);

    return {
        records: Array.isArray(records) ? records : [records],
        recordSpaceStructure
    };
}

export default submitRecords;
