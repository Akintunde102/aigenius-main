import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';

export const getUserUploadedFiles = async () => {

    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayUploadFiles,

        },
        authorized: true,
    });

    return response;
};