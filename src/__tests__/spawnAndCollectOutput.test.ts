import { describe, it, expect } from "vitest";
import { spawnAndCollectOutput } from "../utils/spawnAndCollectOutput.js";

// Mock command for testing
const echoCmd = "echo \"Hello, World!\"";

describe("spawnAndCollectOutput", () => {
  it("should capture stdout and stderr from a successful command", async () => {
    const result = await spawnAndCollectOutput(echoCmd);
    expect(result.stdout).toContain("Hello, World!");
    expect(result.stderr).toBe("");
  });

  it("should capture stderr from a failing command", async () => {
    const result = await spawnAndCollectOutput("ls /nonexistent");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toBe("");
  });
});
