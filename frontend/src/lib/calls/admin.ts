import { authorizedRequest } from './request';

export interface CreditGrantRecord {
    id: string;
    grantedTo: string;
    grantedBy: string | null;
    amount: number;
    createdAt: string | null;
}

export async function getAdminStatus(): Promise<{ isMaster: boolean }> {
    return authorizedRequest<{ isMaster: boolean }>({
        call: 'getGatewayAdminStatus',
    });
}

export async function getAdminCreditsHistory(): Promise<CreditGrantRecord[]> {
    return authorizedRequest<CreditGrantRecord[]>({
        call: 'getGatewayAdminCreditsHistory',
    });
}

export interface AdminUserSearchResult {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    picture: string | null;
}

export async function searchAdminUsers(query: string): Promise<AdminUserSearchResult[]> {
    return authorizedRequest<AdminUserSearchResult[]>({
        call: 'getGatewayAdminUsersSearch',
        pathArgs: { q: query },
    });
}
