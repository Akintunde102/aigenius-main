/// <reference types="@playwright/test" />
import { test, expect } from "@playwright/test";
import { E2E_TOKEN, seedChatHistoryStore } from "./helpers/chatTestHarness";

test.describe("Conversation stream isolation", () => {
  test("switching to another conversation while streaming keeps transcript isolated", async ({
    page,
  }) => {
    const seededSessionA = {
      id: "conversation-a",
      title: "Conversation A",
      modelId: "sao10k/llama-3b",
      messages: [
        {
          id: "a-user-1",
          role: "user",
          content: "A old prompt",
          timestamp: 1,
          modelId: "sao10k/llama-3b",
        },
        {
          id: "a-assistant-1",
          role: "assistant",
          content: "A old response",
          timestamp: 2,
          modelId: "sao10k/llama-3b",
        },
      ],
    };
    const seededSessionB = {
      id: "conversation-b",
      title: "Conversation B",
      modelId: "sao10k/llama-3b",
      messages: [
        {
          id: "b-user-1",
          role: "user",
          content: "B old prompt",
          timestamp: 3,
          modelId: "sao10k/llama-3b",
        },
        {
          id: "b-assistant-1",
          role: "assistant",
          content: "B stable response",
          timestamp: 4,
          modelId: "sao10k/llama-3b",
        },
      ],
    };

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
            firstName: "E2E",
            lastName: "User",
            config: { wallet: 1000, integrations: {} },
            gmailConnected: false,
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
            chatHistory: [seededSessionA, seededSessionB],
          },
        }),
      }),
    );
    await page.route("**/model-chats/conversation/*", (route) => {
      const requestUrl = new URL(route.request().url());
      const id = requestUrl.pathname.split("/").pop();
      const session = id === "conversation-a" ? seededSessionA : seededSessionB;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: true,
          dataReturned: {
            id: session.id,
            session: {
              title: session.title,
              modelId: session.modelId,
              messages: session.messages,
            },
          },
        }),
      });
    });

    const releaseStreamingRef: { current: (() => void) | null } = { current: null };
    const streamGate = new Promise<void>((resolve) => {
      releaseStreamingRef.current = () => {
        resolve();
      };
    });
    await page.route("**/openai/v1/chat/completions**", async (route) => {
      await streamGate;
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "X-Conversation-Id": "conversation-a",
        },
        body: [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "A streaming isolated response." } }] })}`,
          "data: [DONE]",
          "",
        ].join("\n"),
      });
    });

    await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: "load" });
    if (page.url().includes("/login")) {
      test.skip(true, "App redirected to login; authenticated shell is required.");
    }
    await seedChatHistoryStore(page, [seededSessionA, seededSessionB]);
    await page.goto("/chat/conversation-a", { waitUntil: "load" });
    await expect(page.getByText("Conversation A").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder("Type...")).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("Type...").fill("Trigger stream on A");
    await page.getByRole("button", { name: "Send message" }).click();

    await page.getByText("Conversation B").first().click();
    await expect(page).toHaveURL(/\/chat\/conversation-b$/);
    await expect(page.getByText("B stable response").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("A streaming isolated response.")).toHaveCount(0);

    releaseStreamingRef.current?.();
    await expect(page).toHaveURL(/\/chat\/conversation-b$/);
    await expect(page.getByText("A streaming isolated response.")).toHaveCount(0);
  });
});
