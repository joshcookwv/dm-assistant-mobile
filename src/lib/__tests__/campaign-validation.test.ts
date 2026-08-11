import { describe, expect, it } from "@jest/globals";

import { validateCampaignPc } from "../campaign-validation";

type PcForm = { name: string; maxHp: string; ac: string };
type InvalidCase = [PcForm, "name" | "maxHp" | "ac"];

describe("validateCampaignPc", () => {
  it("rejects a blank Max HP before numeric conversion", () => {
    expect(validateCampaignPc({ name: "A", maxHp: "", ac: "12" })).toEqual({
      ok: false,
      field: "maxHp",
    });
  });

  it("rejects a blank Armor Class before numeric conversion", () => {
    expect(validateCampaignPc({ name: "A", maxHp: "8", ac: "" })).toEqual({
      ok: false,
      field: "ac",
    });
  });

  it("accepts whole-number combat fields in their allowed ranges", () => {
    expect(validateCampaignPc({ name: "A", maxHp: "8", ac: "12" })).toEqual({
      ok: true,
      maxHp: 8,
      ac: 12,
    });
  });

  const invalidCases: InvalidCase[] = [
    [{ name: "A", maxHp: "0", ac: "12" }, "maxHp"],
    [{ name: "A", maxHp: "8.5", ac: "12" }, "maxHp"],
    [{ name: "A", maxHp: "8", ac: "-1" }, "ac"],
    [{ name: "A", maxHp: "8", ac: "12.5" }, "ac"],
    [{ name: " ", maxHp: "8", ac: "12" }, "name"],
  ];

  it.each(invalidCases)("rejects invalid PC input %#", (form, field) => {
    expect(validateCampaignPc(form)).toEqual({ ok: false, field });
  });
});
