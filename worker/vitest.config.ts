import path from "node:path";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
      return {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            ANTHROPIC_API_KEY: "test-anthropic-key",
            REVENUECAT_SECRET_API_KEY: "test-revenuecat-key",
            REVENUECAT_ENTITLEMENT_ID: "pro",
            USER_HASH_SECRET: "test-user-hash-secret",
          },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
