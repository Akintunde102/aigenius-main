import axios from "axios";
import { authorizedFetch } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";

const SERVERS_ENDPOINT = `${LINKS.noboxAPIRootUrl}/gateway/*/server-fleet`;

export type ServerRecord = {
  id: string;
  name: string;
  status: string;
  hostname?: string | null;
  platform?: string | null;
  lastHeartbeatAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ServerCommandRecord = {
  id: string;
  command: string;
  status: string;
  source: string;
  exitCode?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  finishedAt?: string | null;
};

export type ServerAlertRecord = {
  id: string;
  kind: string;
  detail?: string | null;
  notifiedAt?: string | null;
  createdAt?: string;
};

export class ServersApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ServersApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : `Request failed (${res.status})`;
    throw new ServersApiError(message, res.status);
  }
  return data as T;
}

export async function fetchServers(): Promise<ServerRecord[]> {
  const res = await authorizedFetch(SERVERS_ENDPOINT);
  return parseResponse<ServerRecord[]>(res);
}

export async function pairServer(name: string): Promise<{
  serverId: string;
  pairingToken: string;
  name: string;
  installCommand: string;
}> {
  const res = await authorizedFetch(SERVERS_ENDPOINT + "/pair", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return parseResponse(res);
}

export async function revokeServer(serverId: string): Promise<void> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/${serverId}`, {
    method: "DELETE",
  });
  await parseResponse(res);
}

export async function fetchServerCommands(serverId: string): Promise<ServerCommandRecord[]> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/${serverId}/commands`);
  return parseResponse(res);
}

export async function fetchServerAlerts(serverId: string): Promise<ServerAlertRecord[]> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/${serverId}/alerts`);
  return parseResponse(res);
}

export async function runServerCommand(
  serverId: string,
  command: string,
): Promise<Record<string, unknown>> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/${serverId}/command`, {
    method: "POST",
    body: JSON.stringify({ command }),
  });
  return parseResponse(res);
}

export async function linkWhatsAppPhone(phone: string): Promise<{ message: string }> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/whatsapp/link`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return parseResponse(res);
}

export async function confirmWhatsAppPhone(phone: string, code: string): Promise<{ verified: boolean }> {
  const res = await authorizedFetch(`${SERVERS_ENDPOINT}/whatsapp/confirm`, {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
  return parseResponse(res);
}

export function isServersAuthError(error: unknown): boolean {
  if (error instanceof ServersApiError && error.statusCode === 401) {
    return true;
  }
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return true;
  }
  return false;
}
