import { describe, expect, it } from "@jest/globals";

import { drawerTarget } from "../drawer-navigation";

describe("drawerTarget", () => {
  it("resets a drawer stack route to its index screen", () => {
    expect(drawerTarget("campaign", { screen: "detail" })).toEqual({
      name: "campaign",
      params: { screen: "index" },
    });
  });

  it("preserves parameters for a nonstack drawer route", () => {
    expect(drawerTarget("import", { source: "drawer" })).toEqual({
      name: "import",
      params: { source: "drawer" },
    });
  });
});
