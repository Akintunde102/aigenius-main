import { UploadFile as AntUploadedFile } from "antd";

export interface UploadedFile extends AntUploadedFile { }

export interface CloudFile {
    id: string,
    name: string,
    originalName: string,
    ownedBy: string,
    s3Link: string,
    updatedAt: string,
    createdAt: string,
    /** Chat conversation this upload was created from (when the client sent `conversationId` on upload). */
    sourceConversationId?: string | null,
    fileSizeInBytes?: number,
    description?: string,
    ownerDetails?: {
        email: string,
        firstName: string,
        lastName: string,
        id: string,
        profileImage?: string
    },
}