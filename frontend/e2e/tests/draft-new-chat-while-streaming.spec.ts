/// <reference types="@playwright/test" />
import { test, expect } from "@playwright/test";
import { E2E_TOKEN } from "./helpers/chatTestHarness";

/**
 * Regression: starting a new chat while a draft stream is in flight must not
 * abort the first request (unique client draft ids per New Chat).
 */
test.describe("Draft new chat while streaming", () => {
  test("Create New Chat during an in-flight draft stream still completes both completions", async ({
    page,
  }) => {
    await page.context().addCookies([
      { name: "nobox_client_token", value: E2E_TOKEN, url: "http://localhost:3001" },
      { name: "nobox_token", value: E2E_TOKEN, url: "http://localhost:3001" },
    ]);
    await page.addInitScript((token: string) => {
      localStorage.setItem("nobox_client_token", token);
      localStorage.setItem("nobox_token", token);
      localStorage.setItem(
        "logged_user_details",
        JSON.stringify({
          id: "e2e-user-id",
          email: "e2e@example.com",
          firstName: "E2E",
          lastName: "User",
          config: { wallet: 1000, integrations: {} },
          gmailConnected: false,
        }),
      );
    }, E2E_TOKEN);

    await page.route("**/gateway/*/logged-user-details**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: true,
          dataReturned: {
            id: "e2e-user-id",
            email: "e2e@example.com",
            config: { wallet: 1000, integrations: {} },
          },
        }),
      }),
    );
    await page.route("**/auth/_/connection_token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: E2E_TOKEN }),
      }),
    );
    await page.route("**/auth/_/refresh", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: E2E_TOKEN }),
      }),
    );
    await page.route("**/model-chats/models**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [{ id: "sao10k/llama-3b", name: "Sao10K Llama 3B" }] }),
      }),
    );
    await page.route("**/model-chats/personalities**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: true, dataReturned: [] }),
      }),
    );
    await page.route("**/gateway/*/admin/status**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: true, dataReturned: { isMaster: false } }),
      }),
    );
    await page.route("**/conversation-events**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: "",
      }),
    );
    await page.route("**/model-chats/resources**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: true,
          dataReturned: {
            savedChats: [],
            savedFullChats: [],
            pinnedChats: [],
            chatHistory: [],
          },
        }),
      }),
    );

    const releaseFirstStreamRef: { current: (() => void) | null } = { current: null };
    const firstStreamGate = new Promise<void>((resolve) => {
      releaseFirstStreamRef.current = () => resolve();
    });
    let fulfilledCompletions = 0;
    let completionIndex = 0;

    await page.route("**/openai/v1/chat/completions**", async (route) => {
      const index = completionIndex++;
      if (index === 0) {
        await firstStreamGate;
      }
      fulfilledCompletions += 1;
      const conversationId = index === 0 ? "conv-draft-first" : "conv-draft-second";
      const content = index === 0 ? "First draft stream completed." : "Second draft stream.";
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "X-Conversation-Id": conversationId,
        },
        body: [
          `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`,
          "data: [DONE]",
          "",
        ].join("\n"),
      });
    });

    await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: "load" });
    if (page.url().includes("/login")) {
      test.skip(true, "App redirected to login; authenticated shell is required.");
    }

    await expect(page.getByPlaceholder("Type...")).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder("Type...").fill("First draft message");
    await page.getByRole("button", { name: "Send message" }).click();

    await page.getByText("Create New Chat").first().click();
    await expect(page.getByPlaceholder("Type...")).toHaveValue("");

    await page.getByPlaceholder("Type...").fill("Second draft message");
    await page.getByRole("button", { name: "Send message" }).click();

    releaseFirstStreamRef.current?.();

    await expect.poll(() => fulfilledCompletions, { timeout: 20_000 }).toBe(2);
  });
});
