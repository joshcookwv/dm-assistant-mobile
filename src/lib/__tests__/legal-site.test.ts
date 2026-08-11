import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@jest/globals";

function page(route: "index" | "privacy" | "licenses"): string {
  const relative = route === "index" ? ["site", "index.html"] : ["site", route, "index.html"];
  return fs.readFileSync(path.join(process.cwd(), ...relative), "utf8");
}

describe("public legal site", () => {
  it("publishes support and repository links from the app repository", () => {
    const home = page("index");
    expect(home).toContain("infernalbuldog@gmail.com");
    expect(home).toContain("https://github.com/joshcookwv/dm-assistant-mobile/issues/new");
    expect(home).toContain("/dm-assistant-mobile/privacy/");
    expect(home).toContain("/dm-assistant-mobile/licenses/");
  });

  it("fully discloses local data, optional AI, purchases, retention, and deletion", () => {
    const privacy = page("privacy");
    for (const required of [
      "infernalbuldog@gmail.com",
      "RevenueCat",
      "Cloudflare",
      "Anthropic",
      "within 30 days",
      "AI output reports",
      "30 days",
      "Google Play",
      "encrypted in transit",
      "not sold",
      "no advertising",
      "no behavioral analytics",
      "ages 16–17 and 18+",
      "uninstalling",
      "request deletion",
    ]) {
      expect(privacy).toContain(required);
    }
  });

  it("contains complete OGL sections 1-15 and every bundled-source attribution", () => {
    const licenses = page("licenses");
    for (const section of [
      "1. Definitions",
      "2. The License",
      "3. Offer and Acceptance",
      "4. Grant and Consideration",
      "5. Representation of Authority to Contribute",
      "6. Notice of License Copyright",
      "7. Use of Product Identity",
      "8. Identification",
      "9. Updating the License",
      "10. Copy of this License",
      "11. Use of Contributor Credits",
      "12. Inability to Comply",
      "13. Termination",
      "14. Reformation",
      "15. COPYRIGHT NOTICE",
    ]) {
      expect(licenses).toContain(section);
    }
    for (const required of [
      "System Reference Document 5.1",
      "System Reference Document 5.2",
      "Creative Commons Attribution 4.0",
      "Creature Codex",
      "Deep Magic for 5th Edition",
      "Tal&#39;dorei Campaign Setting",
      "Tome of Beasts",
      "Vault of Magic",
      "Warlock Zine",
      "Black Flag SRD",
      "Spells That Don&#39;t Suck",
      "not affiliated with, endorsed by, or sponsored by Wizards of the Coast",
    ]) {
      expect(licenses).toContain(required);
    }
  });

  it("keeps the in-app license and Settings links aligned with the public pages", () => {
    const legalScreen = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "settings", "legal.tsx"),
      "utf8",
    );
    const settingsScreen = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "settings", "index.tsx"),
      "utf8",
    );

    expect(legalScreen).toContain("15. COPYRIGHT NOTICE");
    expect(legalScreen).toContain("System Reference Document 5.2");
    expect(legalScreen).toContain("Warlock Zine");
    expect(settingsScreen).toContain("https://joshcookwv.github.io/dm-assistant-mobile/privacy/");
    expect(settingsScreen).toContain("https://joshcookwv.github.io/dm-assistant-mobile/licenses/");
    expect(settingsScreen).toContain("https://github.com/joshcookwv/dm-assistant-mobile/issues/new");
  });
});
