import type { ChatMessage, MessageEvent, ToolEvent, ToolExecution } from '@/app/components/model-interface/shared/types';

const AFFIRMATION_PATTERN =
    /^(yes|yep|yeah|ok|okay|sure|proceed|go ahead|create it|do it|sounds good|confirm)(\s*[!.,"']*)?$/i;

const CREATE_INTENT_PHRASE_PATTERN =
    /\b(proceed|go ahead|create|build|set up|run it|do it|confirm|approved|looks good|sounds good)\b/i;
const WORKFLOW_AGENT_CALL_PATTERN = /\bcall\b.*\bworkflow[_\s-]?agent\b/i;
const NEGATION_PATTERN = /\b(don['’]?t|do not|not now|cancel|stop|wait|hold on)\b/i;

/**
 * True when the user message is a short confirmation with no other substantive text.
 */
export function isPlainWorkflowPlanAffirmation(text: string): boolean {
    const t = text.trim();
    if (!t || t.includes('\n')) {
        return false;
    }
    return AFFIRMATION_PATTERN.test(t);
}

/**
 * True when the user message reasonably indicates "go ahead and create it"
 * even if the message is not a bare one-word affirmation.
 */
export function isWorkflowPlanCreateIntent(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || trimmed.includes('\n')) {
        return false;
    }
    if (NEGATION_PATTERN.test(trimmed)) {
        return false;
    }
    if (isPlainWorkflowPlanAffirmation(trimmed)) {
        return true;
    }
    return CREATE_INTENT_PHRASE_PATTERN.test(trimmed) || WORKFLOW_AGENT_CALL_PATTERN.test(trimmed);
}

function planDraftIdFromToolResult(result: string): string | undefined {
    try {
        const j = JSON.parse(result) as { plan_draft_id?: string };
        const id = j.plan_draft_id?.trim();
        return id && id.length > 0 ? id : undefined;
    } catch {
        const m = result.match(/"plan_draft_id"\s*:\s*"([^"]+)"/);
        const id = m?.[1]?.trim();
        return id && id.length > 0 ? id : undefined;
    }
}

function fromToolExecutions(executions: ToolExecution[] | undefined): string | undefined {
    if (!executions?.length) {
        return undefined;
    }
    for (let i = executions.length - 1; i >= 0; i--) {
        const ex = executions[i];
        if (ex.tool !== 'workflow_agent' || typeof ex.result !== 'string') {
            continue;
        }
        const id = planDraftIdFromToolResult(ex.result);
        if (id) {
            return id;
        }
    }
    return undefined;
}

function isToolEvent(e: MessageEvent): e is ToolEvent {
    return e.type === 'tool';
}

function fromEvents(events: MessageEvent[] | undefined): string | undefined {
    if (!events?.length) {
        return undefined;
    }
    for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (!isToolEvent(e) || e.tool !== 'workflow_agent' || typeof e.result !== 'string') {
            continue;
        }
        const id = planDraftIdFromToolResult(e.result);
        if (id) {
            return id;
        }
    }
    return undefined;
}

/**
 * Latest plan_draft_id from a prior successful workflow_agent(plan) tool result in this transcript.
 */
export function extractLatestWorkflowPlanDraftIdFromChat(messages: ChatMessage[]): string | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== 'assistant') {
            continue;
        }
        const id = fromToolExecutions(m.tool_executions) ?? fromEvents(m.events);
        if (id) {
            return id;
        }
    }
    return undefined;
}

/**
 * When the user typed a bare affirmation and a plan draft exists, append an instruction the main model can follow.
 */
export function augmentUserTextForWorkflowPlanConfirmation(chat: ChatMessage[], userText: string): string {
    const trimmed = userText.trim();
    if (!isWorkflowPlanCreateIntent(trimmed)) {
        return userText;
    }
    const draftId = extractLatestWorkflowPlanDraftIdFromChat(chat);
    if (!draftId) {
        return userText;
    }
    return (
        `${trimmed}\n\n`
        + '[Workflow plan confirmation: the user affirmed the pending plan. Call workflow_agent with intent "create", '
        + `plan_draft_id "${draftId}", confirm_plan_create true, goal "User approved the proposed workflow plan."]`
    );
}
