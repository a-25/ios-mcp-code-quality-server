import { describe, it, expect } from "vitest";
import { spawnAndCollectOutput } from "../utils/spawnAndCollectOutput.js";

describe("spawnAndCollectOutput", () => {
  it("should handle commands with mixed stdout and stderr", async () => {
    // Use a command that outputs to both stdout and stderr
    const result = await spawnAndCollectOutput("echo 'stdout content' && echo 'stderr content' >&2");
    expect(result.stdout).toContain("stdout content");
    expect(result.stderr).toContain("stderr content");
  });

  it("should capture error details when command fails", async () => {
    const result = await spawnAndCollectOutput("false"); // Command that always fails
    expect(result.stdout).toBe("");
    expect(result.stderr).toBeTruthy();
  });

  it("should handle commands with special characters and quotes", async () => {
    const result = await spawnAndCollectOutput("echo 'Test with \"quotes\" and special chars: !@#$'");
    expect(result.stdout).toContain('Test with "quotes" and special chars');
  });
});
