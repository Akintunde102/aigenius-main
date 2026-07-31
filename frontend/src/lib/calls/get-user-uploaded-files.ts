import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';

export const getUserUploadedFiles = async () => {
    try {
        const response = await serverCall({
            serverCallProps: {
                call: serverCalls.getGatewayUploadFiles,
            },
            authorized: true,
        });
        return response;
    } catch {
        return { ok: false, data: [] };
    }
};