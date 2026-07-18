/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    seedAuthenticatedSession,
    stubChatShell,
    stubStreamingCompletion,
    stubAgentRunGet,
    stubAgentRunGetNotFound,
    openChat,
    sendPrompt,
} from './helpers/chatTestHarness';

/**
 * Workflow intent: streamed tool card + persisted transcript expand (same UX on desktop + mobile Chrome projects).
 *
 * Run: `yarn dev:e2e` on :3001, then `npx playwright test e2e/tests/workflow-intent-transcript.spec.ts`
 * Or `CI=1 npx playwright test ...` to reuse/start dev per playwright.config.
 */
const RUN_ID = 'e2e-wf-agent-run-00000000-0000-4000-8000-000000000001';

const COMPLEX_TRANSCRIPT_MESSAGES = [
    {
        role: 'user' as const,
        content: 'Orchestrate digest + search',
        timestamp: 1,
    },
    {
        role: 'assistant' as const,
        content: 'Round 1',
        timestamp: 2,
        events: [
            { type: 'text' as const, content: 'Listing saved workflows…' },
            {
                type: 'tool' as const,
                tool: 'workflow_inner_list',
                displayName: 'List workflows (agent)',
                arguments: {},
                logs: [] as { tag: string; message: string }[],
                loading: false,
                success: true,
                result: '{"success":true,"count":0,"workflows":[]}',
                timestamp: 3,
            },
        ],
    },
    {
        role: 'assistant' as const,
        content: 'Round 2',
        timestamp: 4,
        events: [
            {
                type: 'tool' as const,
                tool: 'serper_google_search',
                displayName: 'serper_google_search',
                arguments: { query: 'ai news' },
                logs: [] as { tag: string; message: string }[],
                loading: false,
                success: true,
                result: '{"success":true,"results":[]}',
                timestamp: 5,
            },
        ],
    },
];

function workflowIntentStreamChunks(agentRunId: string) {
    const result = JSON.stringify({
        success: true,
        agent_run_id: agentRunId,
        summary: 'Workflow agent finished successfully.',
        aggregated_tool_usage_charges: [
            {
                tool: 'workflow_intent_inner_llm',
                display_name: 'Workflow agent (model turn)',
                cost_usd: 0.001,
                cost_naira: 1.5,
            },
        ],
        workflow_ids_touched: ['wf-e2e-1'],
    });

    return [
        { choices: [{ delta: { content: 'Invoking the workflow agent for you.' } }] },
        {
            choices: [
                {
                    delta: {
                        tool_stream_event: {
                            type: 'start',
                            tool: 'workflow_intent',
                            displayName: 'Workflow agent',
                            arguments: { goal: 'Plan my automations', intent: 'auto' },
                        },
                    },
                },
            ],
        },
        {
            choices: [
                {
                    delta: {
                        tool_stream_event: {
                            type: 'log',
                            tag: 'workflow_intent',
                            message: 'Starting workflow agent…',
                        },
                    },
                },
            ],
        },
        {
            choices: [
                {
                    delta: {
                        tool_stream_event: {
                            type: 'end',
                            tool: 'workflow_intent',
                            success: true,
                            result,
                        },
                    },
                },
            ],
        },
        { choices: [{ delta: { content: '\n\nI used the workflow agent.' } }] },
        { usage: { prompt_tokens: 40, completion_tokens: 60, total_tokens: 100 }, cost: 0.002 },
        '[DONE]',
    ];
}

test.describe('Workflow intent — transcript expand', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
        await stubChatShell(page);
    });

    test('happy path: expand shows multi-turn inner tools (screenshot per project)', async ({ page }, testInfo) => {
        await stubAgentRunGet(page, RUN_ID, {
            id: RUN_ID,
            userId: 'e2e-user-id',
            runType: 'workflow_intent',
            correlationId: null,
            conversationId: null,
            parentToolCallId: null,
            messages: COMPLEX_TRANSCRIPT_MESSAGES,
            metadata: { innerModelId: 'e2e/model' },
            totalCostUsd: 0.042,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await stubStreamingCompletion(page, workflowIntentStreamChunks(RUN_ID) as Parameters<typeof stubStreamingCompletion>[1]);

        await openChat(page);
        await sendPrompt(page, 'Help me automate workflows');

        await expect(page.getByText('Workflow agent').first()).toBeVisible({ timeout: 25_000 });

        const detailsBtn = page.getByRole('button', { name: /^Details$/i }).first();
        await detailsBtn.waitFor({ state: 'visible', timeout: 20_000 });
        await detailsBtn.click();

        const transcriptBtn = page.getByRole('button', { name: /Sub-agent transcript/i });
        await expect(transcriptBtn).toBeVisible({ timeout: 10_000 });
        await transcriptBtn.click();

        await expect(page.getByText('Orchestrate digest + search')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('List workflows (agent)')).toBeVisible();
        await expect(page.getByText('serper_google_search')).toBeVisible();

        await page.screenshot({
            path: testInfo.outputPath(`workflow-intent-transcript-${testInfo.project.name}.png`),
            fullPage: true,
        });
    });

    test('404 from agent-run API surfaces an error in the expand panel', async ({ page }) => {
        await stubAgentRunGetNotFound(page, RUN_ID);
        await stubStreamingCompletion(page, workflowIntentStreamChunks(RUN_ID) as Parameters<typeof stubStreamingCompletion>[1]);

        await openChat(page);
        await sendPrompt(page, 'Workflow help');

        await expect(page.getByText('Workflow agent').first()).toBeVisible({ timeout: 25_000 });
        await page.getByRole('button', { name: /^Details$/i }).first().click();
        await page.getByRole('button', { name: /Sub-agent transcript/i }).click();

        await expect(page.getByText(/Agent run not found|Not Found|404|Could not load/i).first()).toBeVisible({
            timeout: 15_000,
        });
    });

    test('network failure while loading transcript shows an error message', async ({ page }) => {
        await stubAgentRunGet(page, RUN_ID, 'network-error');
        await stubStreamingCompletion(page, workflowIntentStreamChunks(RUN_ID) as Parameters<typeof stubStreamingCompletion>[1]);

        await openChat(page);
        await sendPrompt(page, 'Workflow help');

        await expect(page.getByText('Workflow agent').first()).toBeVisible({ timeout: 25_000 });
        await page.getByRole('button', { name: /^Details$/i }).first().click();
        await page.getByRole('button', { name: /Sub-agent transcript/i }).click();

        await expect(page.getByText(/Something went wrong\. Please try again\./i).first()).toBeVisible({
            timeout: 15_000,
        });
    });

    test('failed workflow_intent result hides Sub-agent transcript expand', async ({ page }) => {
        await stubStreamingCompletion(page, [
            {
                choices: [
                    {
                        delta: {
                            tool_stream_event: {
                                type: 'start',
                                tool: 'workflow_intent',
                                displayName: 'Workflow agent',
                                arguments: { goal: 'x' },
                            },
                        },
                    },
                ],
            },
            {
                choices: [
                    {
                        delta: {
                            tool_stream_event: {
                                type: 'end',
                                tool: 'workflow_intent',
                                success: false,
                                result: JSON.stringify({ error: 'Simulated planner failure' }),
                            },
                        },
                    },
                ],
            },
            { usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, cost: 0 },
            '[DONE]',
        ] as Parameters<typeof stubStreamingCompletion>[1]);

        await openChat(page);
        await sendPrompt(page, 'Break the workflow agent');

        await expect(page.getByText('Workflow agent').first()).toBeVisible({ timeout: 25_000 });
        await page.getByRole('button', { name: /^Details$/i }).first().click();

        await expect(page.getByRole('button', { name: /Sub-agent transcript/i })).not.toBeVisible();
    });

    test('re-expand after collapse does not duplicate inner headings (smoke)', async ({ page }) => {
        await stubAgentRunGet(page, RUN_ID, {
            id: RUN_ID,
            userId: 'e2e-user-id',
            runType: 'workflow_intent',
            correlationId: null,
            conversationId: null,
            parentToolCallId: null,
            messages: COMPLEX_TRANSCRIPT_MESSAGES,
            metadata: {},
            totalCostUsd: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await stubStreamingCompletion(page, workflowIntentStreamChunks(RUN_ID) as Parameters<typeof stubStreamingCompletion>[1]);

        await openChat(page);
        await sendPrompt(page, 'Workflows');

        await expect(page.getByText('Workflow agent').first()).toBeVisible({ timeout: 25_000 });
        await page.getByRole('button', { name: /^Details$/i }).first().click();
        const transcriptBtn = page.getByRole('button', { name: /Sub-agent transcript/i });
        await transcriptBtn.click();
        await expect(page.getByText('List workflows (agent)')).toBeVisible({ timeout: 15_000 });
        await transcriptBtn.click();
        await transcriptBtn.click();
        const listLabels = page.getByText('List workflows (agent)');
        await expect(listLabels).toHaveCount(1);
    });
});
