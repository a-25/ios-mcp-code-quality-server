import { describe, it, expect } from "vitest";
import { spawnAndCollectOutput } from "../utils/spawnAndCollectOutput.js";

describe("spawnAndCollectOutput", () => {
  it("should capture stdout from a successful command", async () => {
    const result = await spawnAndCollectOutput("echo \"Hello, World!\"");
    expect(result.stdout).toContain("Hello, World!");
    expect(result.stderr).toBe("");
  });

  it("should capture stderr from a failing command", async () => {
    const result = await spawnAndCollectOutput("ls /nonexistent");
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toBe("");
    expect(result.stderr.toLowerCase()).toContain("no such file");
  });

  it("should handle commands with complex arguments", async () => {
    const result = await spawnAndCollectOutput("echo \"test with spaces and special chars!@#$%\"");
    expect(result.stdout).toContain("test with spaces and special chars!@#$%");
  });

  it("should handle commands that output to both stdout and stderr", async () => {
    // Use a command that writes to both streams
    const result = await spawnAndCollectOutput("sh -c 'echo stdout; echo stderr >&2'");
    expect(result.stdout).toContain("stdout");
    expect(result.stderr).toContain("stderr");
  });
});
