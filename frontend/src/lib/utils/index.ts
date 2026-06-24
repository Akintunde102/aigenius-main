import { fetchAndStoreProjectRecordAndStructureMap } from "../calls/get-record-and-structure-map";
import { FieldType } from "../types";

export const getRecordSpace = (args: {
    allProjects: any;
    recordSpaceSlug: string;
    projectId: string;
}) => {
    const { recordSpaceSlug, allProjects, projectId } = args;
    const selectedProject = allProjects.filter((x: any) => x.id === projectId)[0];
    const recordSpace = selectedProject?.recordSpaces.filter((x: any) => x.slug === recordSpaceSlug)[0];
    return { recordSpace, views: recordSpace?.views };
}

export const convertTypeToViewType = (structureType: string) => {
    return structureType === "TEXT"
        ? "text"
        : structureType === "BOOLEAN"
            ? "checkbox"
            : structureType === "ARRAY"
                ? "array"
                : structureType === "OBJECT"
                    ? "object"
                    : structureType === "NUMBER"
                        ? "number"
                        : "number";
}

export const converthydratedRecordFieldsToInputMetaData = (structure: any) => {
    return structure.map((field: any) => {
        const structureType = field.type;
        const type = convertTypeToViewType(structureType);
        return {
            name: field.name,
            type,
            required: field.required,
            label: field.name,
        };
    });
};


export const convertStructureToHeadings = (structure: any) => {
    const headings = Object.keys(structure).map((key) => {
        const eachStructure = structure[key];
        const { name, required } = eachStructure;
        const structureType = eachStructure.type.name;
        const type =
            structureType === "String"
                ? FieldType.String
                : structureType === "Boolean"
                    ? FieldType.Boolean
                    : structureType === "Array"
                        ? FieldType.Array
                        : FieldType.Number;
        return { name, type, required };
    });

    return headings;
}


export const storeAllProjectsRecordsAndStructure = async (data: any[]) => {
    await Promise.all(data.map(async (project: any) => {
        return fetchAndStoreProjectRecordAndStructureMap(project);
    }))
}
