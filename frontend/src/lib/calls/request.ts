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

    if (!response || response.success === false) {
        const err = response?.error as { statusText?: string; data?: { message?: unknown } } | undefined;
        const message = err?.data?.message ?? err?.statusText ?? 'Request failed';
        throw new Error(typeof message === 'string' ? message : 'Request failed');
    }

    if (response.dataReturned === undefined || response.dataReturned === null) {
        throw new Error('Empty response from server');
    }

    return response.dataReturned as T;
}
