import { authorizedRequest } from './request';

export type CodeProject = {
  id: string;
  userId: string;
  name: string;
  rootPath: string;
  rules: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCodeProjectInput = {
  name: string;
  rootPath: string;
  rules?: string | null;
};

export async function listCodeProjects(): Promise<CodeProject[]> {
  const res = await authorizedRequest<CodeProject[]>({
    call: 'getGatewayCodeProjects',
  });
  return Array.isArray(res) ? res : [];
}

export async function createCodeProject(input: CreateCodeProjectInput): Promise<CodeProject> {
  return authorizedRequest<CodeProject>({
    call: 'postGatewayCodeProjects',
    data: input,
  });
}

export async function updateCodeProject(
  id: string,
  input: Partial<CreateCodeProjectInput>,
): Promise<CodeProject> {
  return authorizedRequest<CodeProject>({
    call: 'putGatewayCodeProjects',
    data: input,
    pathArgs: { id },
  });
}

export async function deleteCodeProject(id: string): Promise<{ success: boolean }> {
  return authorizedRequest<{ success: boolean }>({
    call: 'deleteGatewayCodeProjects',
    pathArgs: { id },
  });
}

export async function assignConversationCodeProject(
  conversationId: string,
  codeProjectId: string | null,
): Promise<unknown> {
  return authorizedRequest({
    call: 'postGatewayModelChatsConversationCodeProject',
    data: { codeProjectId },
    pathArgs: { id: conversationId },
  });
}
