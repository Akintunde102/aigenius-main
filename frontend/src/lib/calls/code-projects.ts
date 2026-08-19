import { authorizedRequest } from './request';
import { waitForAccessToken } from '@/lib/api/wait-for-access-token';

export type CodeProject = {
  id: string;
  userId: string;
  name: string;
  rootPath: string;
  description?: string | null;
  rules: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCodeProjectInput = {
  name: string;
  rootPath: string;
  description?: string | null;
  rules?: string | null;
};

export async function listCodeProjects(): Promise<CodeProject[]> {
  await waitForAccessToken();
  const res = await authorizedRequest<CodeProject[]>({
    call: 'getGatewayCodeProjects' as any,
  });
  return Array.isArray(res) ? res : [];
}

export async function createCodeProject(input: CreateCodeProjectInput): Promise<CodeProject> {
  await waitForAccessToken();
  return authorizedRequest<CodeProject>({
    call: 'postGatewayCodeProjects' as any,
    data: input,
  });
}

export async function updateCodeProject(
  id: string,
  input: Partial<CreateCodeProjectInput>,
): Promise<CodeProject> {
  await waitForAccessToken();
  return authorizedRequest<CodeProject>({
    call: 'putGatewayCodeProjects' as any,
    data: input,
    pathArgs: { id },
  });
}

export async function deleteCodeProject(id: string): Promise<{ success: boolean }> {
  await waitForAccessToken();
  return authorizedRequest<{ success: boolean }>({
    call: 'deleteGatewayCodeProjects' as any,
    pathArgs: { id },
  });
}

export async function assignConversationCodeProject(
  conversationId: string,
  codeProjectId: string | null,
): Promise<unknown> {
  await waitForAccessToken();
  return authorizedRequest({
    call: 'postGatewayModelChatsConversationCodeProject' as any,
    data: { codeProjectId },
    pathArgs: { id: conversationId },
  });
}
