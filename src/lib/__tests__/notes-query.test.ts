import { describe, expect, it, jest } from "@jest/globals";

import { buildFtsQuery } from "../notes";

jest.mock("../db", () => ({ getDb: jest.fn() }));

describe("buildFtsQuery", () => {
  it("quotes punctuation so FTS5 treats a period as text", () => {
    expect(buildFtsQuery("ancient.dragon")).toBe('"ancient.dragon"*');
  });

  it("quotes each nonempty token and escapes embedded quotes", () => {
    expect(buildFtsQuery('  red-dragon  "lair" ')).toBe('"red-dragon"* """lair"""*');
  });
});
