import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "src/__tests__/**",
        "**/*.test.ts",
        "**/node_modules/**",
        "dist/**"
      ]
    },
    globals: true
  }
});
