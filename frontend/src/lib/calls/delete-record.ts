import getNoboxModel from "./get-nobox-model";

interface DeleteRecordsArgs {
    recordSpaceSlug: string;
    recordId: string;
    project: any;
}

const deleteRecords = async ({
    recordSpaceSlug,
    recordId,
    project
}: DeleteRecordsArgs) => {
    const { rowedModel, } = await getNoboxModel({
        project,
        recordSpaceSlug,
    });

    if (rowedModel) {
        await rowedModel?.deleteOneById(recordId);
    }

}

export default deleteRecords;
