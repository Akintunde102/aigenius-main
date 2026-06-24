import { authorizedRequest } from './request';
import type { ChatMessage } from '@/app/components/model-interface/shared/types/types';

/** Row shape from the authenticated agent-run endpoint (matches `agent_run` messages JSON). */
export type AgentRunApiPayload = {
    id: string;
    userId: string;
    runType: string;
    correlationId: string | null;
    conversationId: string | null;
    parentToolCallId: string | null;
    messages: ChatMessage[];
    metadata: Record<string, unknown> | null;
    totalCostUsd: number | null;
    createdAt: string;
    updatedAt: string;
};

export async function getAgentRunById(runId: string): Promise<AgentRunApiPayload> {
    return authorizedRequest<AgentRunApiPayload>({
        call: 'getGatewayModelChatsAgentRunById',
        pathArgs: { id: runId },
    });
}
