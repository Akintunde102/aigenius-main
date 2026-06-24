import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';

type ServerCallKey = keyof typeof serverCalls;

export async function authorizedRequest<T>(args: {
    call: ServerCallKey;
    data?: unknown;
    pathArgs?: Record<string, string>;
}): Promise<T> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls[args.call],
            ...(args.data !== undefined ? { data: args.data } : {}),
        },
        ...(args.pathArgs ? { pathArgs: args.pathArgs } : {}),
        authorized: true,
    });

    return response.dataReturned as T;
}
