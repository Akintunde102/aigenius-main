import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";

export interface HostedFilePublicUser {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
}

export type HostedFileVisibility = 'public' | 'restricted';

export interface HostedFilePublic {
    id: string;
    userId: string;
    uploadId?: string | null;
    slug: string;
    title: string;
    description?: string | null;
    markdownContent: string;
    markdownS3Link: string;
    contentHash: string;
    contentType?: string;
    visibility?: HostedFileVisibility;
    allowedEmails?: string[];
    isPublished?: boolean;
    codeProjectId?: string | null;
    publishedAt?: string;
    updatedAt?: string;
    createdAt?: string;
    user?: HostedFilePublicUser | null;
    access?: 'public';
}

export interface HostedFileRestricted {
    access: 'restricted';
    slug: string;
}

export type HostedFilePublicResult = HostedFilePublic | HostedFileRestricted;

export interface PublishHostedFileInput {
    id?: string;
    uploadId?: string;
    markdown?: string;
    title?: string;
    description?: string;
    slug?: string;
    visibility?: HostedFileVisibility;
    allowedEmails?: string[];
    codeProjectId?: string | null;
    publish?: boolean;
}

export function isRestrictedHostedFile(value: unknown): value is HostedFileRestricted {
    return Boolean(value && typeof value === 'object' && (value as HostedFileRestricted).access === 'restricted');
}

export async function publishHostedFile(input: PublishHostedFileInput): Promise<HostedFilePublic> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayHostedFiles,
            data: input,
        },
        authorized: true,
    });
    return response.dataReturned;
}

export async function updateHostedFile(id: string, input: PublishHostedFileInput): Promise<HostedFilePublic> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.putGatewayHostedFiles,
            data: input,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
}

export async function publishHostedFileById(id: string, input: PublishHostedFileInput = {}): Promise<HostedFilePublic> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayHostedFilesPublish,
            data: input,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
}

export async function getMyHostedFiles(): Promise<HostedFilePublic[]> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayHostedFiles,
        },
        authorized: true,
    });
    return response.dataReturned ?? [];
}

export async function unpublishHostedFile(id: string): Promise<boolean> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayHostedFilesUnpublish,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
}

export async function deleteHostedFile(id: string): Promise<boolean> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayHostedFiles,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
}

export async function getAllHostedFiles(): Promise<HostedFilePublic[]> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getAllGatewayHostedFiles,
        },
        authorized: false,
    });
    return response.dataReturned ?? [];
}

export async function getHostedFileBySlug(hostedSlug: string): Promise<HostedFilePublicResult | null> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayPublicHostedFile,
        },
        pathArgs: { hostedSlug },
        authorized: false,
    });
    return response.dataReturned ?? null;
}

export async function getViewableHostedFileBySlug(hostedSlug: string): Promise<HostedFilePublic> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayHostedFileBySlug,
        },
        pathArgs: { hostedSlug },
        authorized: true,
    });
    return response.dataReturned;
}
