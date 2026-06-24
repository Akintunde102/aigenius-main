import { authHttp } from '@/lib/api/auth-client';
import { LINKS } from '@/lib/links';

export interface GetLogsArgs {
    projectId?: string;
    recordSpaceId?: string;
    recordId?: string;
}

export const getLogs = async (args: GetLogsArgs = {}) => {
    const params = new URLSearchParams();
    if (args.projectId) params.append('projectId', args.projectId);
    if (args.recordSpaceId) params.append('recordSpaceId', args.recordSpaceId);
    if (args.recordId) params.append('recordId', args.recordId);

    const res = await authHttp.get(
        `${LINKS.noboxGatewayRootUrl}/logs${params.toString() ? `?${params.toString()}` : ''}`,
        { headers: { 'Content-Type': 'application/json' } },
    );

    return res.data;
};

export type LogItem = {
    id: string;
    createdAt?: string;
    clientDetails?: any;
    project?: { id: string; slug: string } | null;
    recordSpace?: { id: string; slug: string } | null;
    recordId?: string | null;
};
