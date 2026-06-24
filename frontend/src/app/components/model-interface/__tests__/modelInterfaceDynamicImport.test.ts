jest.mock("@/app/components/model-interface/ModelInterface", () => ({
  __esModule: true,
  default: function ModelInterfaceStub() {
    return null;
  },
}));

import { importModelInterfaceWithRetry } from "../modelInterfaceDynamicImport";

describe("importModelInterfaceWithRetry", () => {
  it("resolves the ModelInterface module", async () => {
    const mod = await importModelInterfaceWithRetry();
    expect(mod).toMatchObject({ default: expect.any(Function) });
  });
});
