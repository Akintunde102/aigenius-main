/**
 * Captures a real chat-shell screenshot for the marketing homepage hero.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:23001 node scripts/capture-home-hero-screenshot.cjs
 */
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:23001";
const E2E_TOKEN = "e2e-fake-token";
const TEST_MODEL_ID = "sao10k/llama-3b";
const OUT_PATH = path.join(__dirname, "..", "public", "images", "home-hero-screenshot.png");

const COLOR_MODE_KEY = "aigenius-color-mode";

const CODE_PROJECTS = [
  {
    id: "proj-platform",
    userId: "e2e-user-id",
    name: "aigenius-platform",
    rootPath: "/projects/aigenius-platform",
    description: null,
    rules: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "proj-dashboard",
    userId: "e2e-user-id",
    name: "client-dashboard",
    rootPath: "/projects/client-dashboard",
    description: null,
    rules: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "proj-docs",
    userId: "e2e-user-id",
    name: "docs-site",
    rootPath: "/projects/docs-site",
    description: null,
    rules: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const CHAT_SESSIONS = [
  {
    id: "sess-arch",
    title: "API architecture review",
    modelId: TEST_MODEL_ID,
    codeProjectId: "proj-platform",
    messages: [
      {
        id: "m1",
        role: "user",
        content:
          "Map this repo's chat gateway and summarize how conversations are queued.",
        timestamp: Date.now() - 120000,
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "I traced the NestJS gateway chat domain — queue service, completion mixin, and model routing. Here's a high-level map of request flow and persistence.",
        timestamp: Date.now() - 90000,
      },
      {
        id: "m3",
        role: "assistant",
        content: "Want me to diagram the streaming path or list the key controllers?",
        timestamp: Date.now() - 60000,
      },
    ],
    metadata: { lastAccessed: new Date().toISOString(), totalCost: 0.02, totalTokens: 840 },
  },
  {
    id: "sess-marketing",
    title: "Q1 marketing draft",
    modelId: TEST_MODEL_ID,
    codeProjectId: "proj-dashboard",
    messages: [],
    metadata: { lastAccessed: new Date(Date.now() - 86400000).toISOString() },
  },
  {
    id: "sess-invoice",
    title: "Invoice reconciliation",
    modelId: TEST_MODEL_ID,
    messages: [],
    metadata: { lastAccessed: new Date(Date.now() - 172800000).toISOString() },
  },
  {
    id: "sess-onboard",
    title: "Onboarding flow ideas",
    modelId: TEST_MODEL_ID,
    messages: [],
    metadata: { lastAccessed: new Date(Date.now() - 259200000).toISOString() },
  },
];

function conversationPayload(session) {
  return {
    id: session.id,
    userId: "e2e-user-id",
    codeProjectId: session.codeProjectId ?? null,
    type: "chat_history",
    conversationKind: "default",
    session: {
      title: session.title,
      modelId: session.modelId,
      messages: session.messages,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function jsonResponse(body) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function seedIndexedDb(page) {
  await page.evaluate(async (sessions) => {
    const request = indexedDB.open("ChatStorageDB", 3);

    await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of ["savedChats", "savedFullChats", "chatHistory", "pinnedChats", "lastSync"]) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, {
              keyPath: storeName === "lastSync" ? "type" : "id",
            });
          }
        }
      };
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const db = request.result;
    const transaction = db.transaction(
      ["savedChats", "savedFullChats", "chatHistory", "pinnedChats", "lastSync"],
      "readwrite",
    );

    for (const storeName of ["savedChats", "savedFullChats", "chatHistory", "pinnedChats", "lastSync"]) {
      await new Promise((resolve, reject) => {
        const clearRequest = transaction.objectStore(storeName).clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    }

    for (const session of sessions) {
      await new Promise((resolve, reject) => {
        const addRequest = transaction.objectStore("chatHistory").add(session);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }

    await new Promise((resolve, reject) => {
      const putRequest = transaction.objectStore("lastSync").put({
        type: "chatHistory",
        timestamp: Date.now(),
      });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });

    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  }, CHAT_SESSIONS);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  await context.addCookies([
    { name: "nobox_client_token", value: E2E_TOKEN, url: BASE_URL },
    { name: "nobox_token", value: E2E_TOKEN, url: BASE_URL },
  ]);

  await page.addInitScript(
    ({ token, colorKey }) => {
      localStorage.setItem("nobox_client_token", token);
      localStorage.setItem("nobox_token", token);
      localStorage.setItem(colorKey, "dark");
      localStorage.setItem("aigenius_desktop_sidebar_open", "true");
      localStorage.setItem(
        "logged_user_details",
        JSON.stringify({
          id: "e2e-user-id",
          email: "e2e@example.com",
          firstName: "E2E",
          lastName: "User",
          config: { wallet: 100000, integrations: {} },
          gmailConnected: false,
        }),
      );
    },
    { token: E2E_TOKEN, colorKey: COLOR_MODE_KEY },
  );

  await page.route("**/gateway/*/logged-user-details**", (route) =>
    route.fulfill(
      jsonResponse({
        data: true,
        dataReturned: {
          id: "e2e-user-id",
          email: "e2e@example.com",
          firstName: "E2E",
          lastName: "User",
          config: { wallet: 100000, integrations: {} },
          gmailConnected: false,
        },
      }),
    ),
  );

  await page.route("**/*logged-user-details*", (route) =>
    route.fulfill(
      jsonResponse({
        data: true,
        dataReturned: {
          id: "e2e-user-id",
          email: "e2e@example.com",
          firstName: "E2E",
          lastName: "User",
          config: { wallet: 100000, integrations: {} },
          gmailConnected: false,
        },
      }),
    ),
  );

  await page.route("**/auth/_/connection_token", (route) =>
    route.fulfill(jsonResponse({ token: E2E_TOKEN })),
  );
  await page.route("**/auth/_/refresh", (route) =>
    route.fulfill(jsonResponse({ token: E2E_TOKEN })),
  );

  await page.route("**/model-chats/resources**", (route) =>
    route.fulfill(
      jsonResponse({
        data: true,
        dataReturned: {
          savedChats: [],
          savedFullChats: [],
          pinnedChats: [],
          chatHistory: CHAT_SESSIONS,
        },
      }),
    ),
  );

  await page.route("**/model-chats/models**", (route) =>
    route.fulfill(
      jsonResponse({
        data: [{ id: TEST_MODEL_ID, name: "Sao10K Llama 3B" }],
      }),
    ),
  );

  await page.route("**/model-chats/personalities**", (route) =>
    route.fulfill(jsonResponse({ data: true, dataReturned: [] })),
  );

  await page.route("**/model-chats/chat-history**", (route) =>
    route.fulfill(jsonResponse({ data: true, dataReturned: CHAT_SESSIONS })),
  );

  await page.route("**/model-chats/pinned**", (route) =>
    route.fulfill(jsonResponse({ data: true, dataReturned: [] })),
  );

  await page.route("**/gateway/*/admin/status**", (route) =>
    route.fulfill(jsonResponse({ data: true, dataReturned: { isMaster: false } })),
  );

  await page.route("**/code-projects**", (route) =>
    route.fulfill(jsonResponse({ data: true, dataReturned: CODE_PROJECTS })),
  );

  await page.route("**/model-chats/conversation/sess-arch", (route) =>
    route.fulfill(
      jsonResponse({
        data: true,
        dataReturned: conversationPayload(CHAT_SESSIONS[0]),
      }),
    ),
  );

  await page.route("**/conversation-events**", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: "" }),
  );

  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(60000);

  const targetUrl = `${BASE_URL}/chat/sess-arch?token=${E2E_TOKEN}`;
  await page.goto(targetUrl, { waitUntil: "load", timeout: 120000 });

  const composer = page.getByPlaceholder(/How can I help you today|Type\.\.\.|Ask/i);
  await composer.waitFor({ state: "visible", timeout: 60000 });

  if (!(await page.getByText("API architecture review").isVisible().catch(() => false))) {
    await page.keyboard.press("Control+b");
    await page.waitForTimeout(500);
  }

  try {
    await page.getByText(/Map this repo/i).first().waitFor({
      state: "visible",
      timeout: 25000,
    });
  } catch (error) {
    console.warn("Chat messages not visible; capturing sidebar-only state.", error);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");

  await page.waitForTimeout(1200);

  await page.screenshot({ path: OUT_PATH, type: "png", fullPage: false });

  await browser.close();
  console.log(`Saved homepage hero screenshot to ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
