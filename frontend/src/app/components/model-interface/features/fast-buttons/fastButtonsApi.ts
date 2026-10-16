import axios from "axios";
import { authHttp } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";

const FAST_BUTTONS_ENDPOINT = `${LINKS.noboxAPIRootUrl}/gateway/*/fast-buttons`;

export type FastButtonKind = "agent_instruction" | "shell_command" | "chat_instruction";

export type FastButtonConfig = {
  instruction?: string;
  command?: string;
  cwd?: string;
  modelId?: string;
  conversationTitle?: string;
};

export type FastButtonRecord = {
  id: string;
  label: string;
  kind: FastButtonKind;
  config: FastButtonConfig;
  sortOrder: number;
  source?: string;
};

export type FastButtonRunStatus = "pending_client" | "running" | "succeeded" | "failed";

export type FastButtonSuggestionProposal = {
  proposalId: string;
  label: string;
  kind: FastButtonKind;
  config: FastButtonConfig;
  rationale: string;
};

export type StartRunResponse = {
  runId: string;
  conversationId: string | null;
  status: FastButtonRunStatus;
  kind: FastButtonKind;
  label: string;
  config: FastButtonConfig;
  codeProjectId?: string | null;
};

export async function fetchFastButtons(): Promise<FastButtonRecord[]> {
  const { data } = await authHttp.get<{ buttons: FastButtonRecord[] }>(FAST_BUTTONS_ENDPOINT);
  return data.buttons ?? [];
}

export async function upsertFastButton(payload: {
  id?: string;
  label: string;
  kind: FastButtonKind;
  config: FastButtonConfig;
  sortOrder?: number;
}): Promise<FastButtonRecord> {
  const { data } = await authHttp.post<{ button: FastButtonRecord }>(FAST_BUTTONS_ENDPOINT, payload);
  return data.button;
}

export async function deleteFastButton(id: string): Promise<void> {
  await authHttp.delete(`${FAST_BUTTONS_ENDPOINT}/${id}`);
}

export async function startFastButtonRun(
  buttonId: string,
  codeProjectId?: string | null,
): Promise<StartRunResponse> {
  const { data } = await authHttp.post<StartRunResponse>(
    `${FAST_BUTTONS_ENDPOINT}/${buttonId}/run`,
    { codeProjectId: codeProjectId ?? null },
  );
  return data;
}

export async function completeFastButtonRun(
  runId: string,
  body: {
    status: "succeeded" | "failed";
    summary?: string;
    stdoutPreview?: string;
    errorMessage?: string;
    conversationId?: string;
  },
) {
  const { data } = await authHttp.patch(`${FAST_BUTTONS_ENDPOINT}/runs/${runId}`, body);
  return data.run;
}

export async function generateFastButtonSuggestions(): Promise<FastButtonSuggestionProposal[]> {
  const { data } = await authHttp.post<{ proposals: FastButtonSuggestionProposal[] }>(
    `${FAST_BUTTONS_ENDPOINT}/suggestions/generate`,
    {},
  );
  return data.proposals ?? [];
}

export async function acceptFastButtonSuggestions(
  proposals: FastButtonSuggestionProposal[],
): Promise<FastButtonRecord[]> {
  const { data } = await authHttp.post<{ buttons: FastButtonRecord[] }>(
    `${FAST_BUTTONS_ENDPOINT}/suggestions/accept`,
    { proposals },
  );
  return data.buttons ?? [];
}

export function isFastButtonsApiError(error: unknown): boolean {
  return axios.isAxiosError(error);
}
