import { test, expect } from '@playwright/test';

test.describe('Voice Streaming Resilience', () => {
    test('should finish speaking partial response even if the stream crashes', async ({ page }) => {
        // 1. Mock the login/auth state if necessary (assuming local dev is already authenticated or uses bypass)
        await page.goto('/');
        
        // 2. Mock the speech synthesis API to track calls
        await page.evaluate(() => {
            (window as any).spokenUtterances = [];
            const originalSpeak = window.speechSynthesis.speak;
            window.speechSynthesis.speak = (utterance) => {
                (window as any).spokenUtterances.push(utterance.text);
                // Call onend immediately for the test or just let it be
                setTimeout(() => {
                    const event = new Event('end');
                    utterance.dispatchEvent(event);
                    if (utterance.onend) utterance.onend(event as any);
                }, 100);
            };
        });

        // 3. Mock the gateway stream to fail halfway
        await page.route('**/chat/completions', async (route) => {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    // Send a valid chunk
                    const chunk1 = {
                        choices: [{
                            delta: { content: 'This is a resilient ' },
                            finish_reason: null
                        }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk1)}\n\n`));
                    
                    // Send another valid chunk
                    const chunk2 = {
                        choices: [{
                            delta: { content: 'test case.' },
                            finish_reason: null
                        }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk2)}\n\n`));

                    // Send an ERROR chunk
                    const errorChunk = {
                        error: { message: 'Provider connection lost halfway' }
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
                    
                    controller.close();
                }
            });

            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: stream as any
            });
        });

        // 4. Trigger a chat message in audio mode
        // Note: We assume there's a button or shortcut to enable audio mode
        // For this test, we'll just check if the text arrives in the speech synth
        await page.fill('textarea', 'Simulate stream crash');
        await page.keyboard.press('Enter');

        // 5. Verify that the TTS spoke the combined text despite the error
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).spokenUtterances);
        }, {
            timeout: 5000
        }).toContain('This is a resilient test case.');

        // 6. Verify that an error toast or message appeared
        await expect(page.locator('text=Provider connection lost halfway')).toBeVisible();
    });
});
