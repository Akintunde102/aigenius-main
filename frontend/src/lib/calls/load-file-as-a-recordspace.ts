import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";

export const loadFileAsRecordSpace = async (fileId: string, spaceName: string, projectId: string) => {
    const res = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayLoadFile,
            data: {
                name: spaceName,
                fileId,
                description: "",
                slug: spaceName.toLowerCase(),
            }
        },
        pathArgs: { projectId },
        authorized: true,
        onSuccess: (data) => {
            // File loaded as record space successfully
        },
    });
    return res;
}