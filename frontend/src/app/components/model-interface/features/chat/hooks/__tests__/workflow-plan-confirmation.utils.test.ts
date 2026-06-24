import type { ChatMessage } from '@/app/components/model-interface/shared/types';
import {
    augmentUserTextForWorkflowPlanConfirmation,
    extractLatestWorkflowPlanDraftIdFromChat,
    isPlainWorkflowPlanAffirmation,
    isWorkflowPlanCreateIntent,
} from '../workflow-plan-confirmation.utils';

describe('workflow-plan-confirmation.utils', () => {
    it('detects plain affirmations', () => {
        expect(isPlainWorkflowPlanAffirmation('yes')).toBe(true);
        expect(isPlainWorkflowPlanAffirmation('Yes!')).toBe(true);
        expect(isPlainWorkflowPlanAffirmation('create it')).toBe(true);
        expect(isPlainWorkflowPlanAffirmation('yes but only mondays')).toBe(false);
        expect(isPlainWorkflowPlanAffirmation('')).toBe(false);
    });

    it('detects natural create intent with extra words', () => {
        expect(isWorkflowPlanCreateIntent('yes, go ahead and create it')).toBe(true);
        expect(isWorkflowPlanCreateIntent('please proceed with this plan')).toBe(true);
        expect(isWorkflowPlanCreateIntent('You need to call workflow_agent now')).toBe(true);
        expect(isWorkflowPlanCreateIntent("don't create it yet")).toBe(false);
        expect(isWorkflowPlanCreateIntent('wait for now')).toBe(false);
    });

    it('extracts plan_draft_id from tool_executions', () => {
        const chat: ChatMessage[] = [
            {
                role: 'assistant',
                content: 'Plan ready.',
                timestamp: 1,
                tool_executions: [
                    {
                        tool: 'workflow_agent',
                        arguments: {},
                        result: JSON.stringify({
                            success: true,
                            plan_draft_id: '11111111-1111-4111-8111-111111111111',
                            summary: 'ok',
                        }),
                        timestamp: 2,
                    },
                ],
            },
        ];
        expect(extractLatestWorkflowPlanDraftIdFromChat(chat)).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('augments yes when draft exists', () => {
        const chat: ChatMessage[] = [
            {
                role: 'assistant',
                content: 'Plan.',
                timestamp: 1,
                tool_executions: [
                    {
                        tool: 'workflow_agent',
                        arguments: {},
                        result: JSON.stringify({ success: true, plan_draft_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' }),
                        timestamp: 2,
                    },
                ],
            },
        ];
        const out = augmentUserTextForWorkflowPlanConfirmation(chat, 'yes');
        expect(out).toContain('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');
        expect(out).toContain('confirm_plan_create true');
    });

    it('augments longer proceed-style confirmations when draft exists', () => {
        const chat: ChatMessage[] = [
            {
                role: 'assistant',
                content: 'Plan.',
                timestamp: 1,
                tool_executions: [
                    {
                        tool: 'workflow_agent',
                        arguments: {},
                        result: JSON.stringify({ success: true, plan_draft_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' }),
                        timestamp: 2,
                    },
                ],
            },
        ];
        const out = augmentUserTextForWorkflowPlanConfirmation(chat, 'Please go ahead and create it');
        expect(out).toContain('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');
        expect(out).toContain('confirm_plan_create true');
    });
});
