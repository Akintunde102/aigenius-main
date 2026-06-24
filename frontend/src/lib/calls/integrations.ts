import { authorizedRequest } from './request';

export async function getGmailConnectUrl(): Promise<{ url: string }> {
  return authorizedRequest<{ url: string }>({
    call: 'getGatewayIntegrationsGmailConnect',
  });
}

export async function getGmailStatus(): Promise<{ connected: boolean }> {
  return authorizedRequest<{ connected: boolean }>({
    call: 'getGatewayIntegrationsGmailStatus',
  });
}

export async function disconnectGmail(): Promise<{ disconnected: boolean }> {
  return authorizedRequest<{ disconnected: boolean }>({
    call: 'deleteGatewayIntegrationsGmail',
  });
}

/**
 * @param reauthorize When true (default), asks the backend to add consent/login hints so LinkedIn is more
 * likely to show the permission screen again instead of silently redirecting.
 */
export async function getLinkedInConnectUrl(options?: { reauthorize?: boolean }): Promise<{ url: string }> {
  return authorizedRequest<{ url: string }>({
    call: 'getGatewayIntegrationsLinkedinConnect',
    pathArgs: { reauthorize: String(options?.reauthorize !== false) },
  });
}

export async function getLinkedInStatus(): Promise<{ connected: boolean }> {
  return authorizedRequest<{ connected: boolean }>({
    call: 'getGatewayIntegrationsLinkedinStatus',
  });
}

export async function disconnectLinkedIn(): Promise<{ disconnected: boolean }> {
  return authorizedRequest<{ disconnected: boolean }>({
    call: 'deleteGatewayIntegrationsLinkedin',
  });
}
