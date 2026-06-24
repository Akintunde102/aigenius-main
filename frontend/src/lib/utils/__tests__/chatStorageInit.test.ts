import { initializeChatStorage } from "../chatStorageInit";
import { openChatDatabase } from "../chatStorage";

jest.mock("../chatStorage", () => ({
  openChatDatabase: jest.fn(),
}));

const openChatDatabaseMock = openChatDatabase as jest.MockedFunction<
  typeof openChatDatabase
>;

describe("initializeChatStorage", () => {
  const originalError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
    openChatDatabaseMock.mockReset();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("logs at most once when openChatDatabase keeps failing", async () => {
    openChatDatabaseMock.mockRejectedValue(new Error("indexeddb blocked"));

    await initializeChatStorage();
    await initializeChatStorage();

    expect(console.error).toHaveBeenCalledTimes(1);
    expect((console.error as jest.Mock).mock.calls[0][0]).toContain(
      "Failed to initialize chat storage",
    );
  });

  it("does not log when openChatDatabase succeeds", async () => {
    openChatDatabaseMock.mockResolvedValue({} as IDBDatabase);

    await initializeChatStorage();

    expect(console.error).not.toHaveBeenCalled();
  });
});
