export interface FindProjectArgs {
    projects?: any[];
    projectId: string;
}

export enum CompatibleStructureFieldType {
    text = "TEXT",
    number = "NUMBER",
    boolean = "BOOLEAN",
    array = "ARRAY",
    object = "OBJECT"
}

export enum PageTypes {
    recordSpacesList = "record-spaces-list",
    recordsList = "records-list"
}

export enum PagePathNames {
    recordSpacePathName = "record-spaces",
    recordsPathName = "records"
}

export enum FieldType {
    Number = "number",
    String = "string",
    Boolean = "boolean",
    Array = "array"
}

export enum InputTypes {
    NUMBER = 'number',
    TEXT = 'text',
    PASSWORD = 'password',
    EMAIL = 'email',
    RADIO = 'radio',
    CHECKBOX = 'checkbox',
    SELECT = 'select',
    DATE = 'date',
    EDITOR = 'editor'
}


export type UserDetailsInLocalStorage = {
    email: string,
    firstName: string,
    lastName: string,
    id: string,
    picture: string
}

export interface UserAccess {
    createdAt: string;
    dateAdded: string;
    folderId: string | null;
    giver: string;
    taker: string;
    takerDetails: {
        email: string;
        firstName: string;
        lastName: string;
        profileImage: string;
        id: string;
    };
}


export interface CreatorDetails {
    email: string;
    firstName: string;
    lastName: string;
    id: string;
    profileImage: string;
}

export interface Folder {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    tags: string[];
    projectSlug: string | null;
    createdAt: string;
    updatedAt: string;
    creatorDetails: CreatorDetails;
}

export interface UserSharedFile {
    id: string;
    name: string;
    originalName: string;
    ownedBy: string;
    s3Link: string;
    fileSizeInBytes: number;
    createdAt: string;
    updatedAt: string;
    creatorDetails: CreatorDetails;
}
