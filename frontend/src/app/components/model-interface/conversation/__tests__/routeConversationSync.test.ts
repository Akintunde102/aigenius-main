import {
  computeRoutePropSync,
  type RouteConversationId,
} from "../routeConversationSync";

describe("computeRoutePropSync", () => {
  const cases: Array<{
    last: RouteConversationId;
    incoming: RouteConversationId;
    expectChanged: boolean;
    nextActive?: RouteConversationId;
  }> = [
    { last: null, incoming: null, expectChanged: false },
    { last: "a", incoming: "a", expectChanged: false },
    { last: null, incoming: "x", expectChanged: true, nextActive: "x" },
    { last: "a", incoming: "b", expectChanged: true, nextActive: "b" },
    { last: "a", incoming: null, expectChanged: true, nextActive: null },
  ];

  it.each(cases)(
    "last=$last incoming=$incoming → changed=$expectChanged",
    ({ last, incoming, expectChanged, nextActive }) => {
      const r = computeRoutePropSync(last, incoming);
      if (!expectChanged) {
        expect(r.kind).toBe("unchanged");
        if (r.kind === "unchanged") {
          expect(r.lastSyncedProp).toBe(last);
        }
      } else {
        expect(r.kind).toBe("changed");
        if (r.kind === "changed") {
          expect(r.nextActiveId).toBe(nextActive);
          expect(r.lastSyncedProp).toBe(incoming);
        }
      }
    },
  );
});
