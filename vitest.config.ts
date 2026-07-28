import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // HTTP suite needs just dev; keep unit tests fast by default.
    testTimeout: 15_000,
  },
});
