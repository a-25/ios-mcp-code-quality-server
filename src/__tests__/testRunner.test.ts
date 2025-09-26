// import testFailureMock from './mockData/testFailureMock.json' with { type: 'json' };
import testFailureMock from "./mockData/testFailureMock.json" with { type: "json" };
import { vi, describe, it, expect } from "vitest";

// Mock execAsync before importing getXcresultObject
vi.mock("../core/testRunner.js", async () => {
  const actual = await vi.importActual("../core/testRunner.js");
  return {
    ...actual,
    execAsync: vi.fn().mockResolvedValue({ stdout: JSON.stringify(testFailureMock) })
  };
});

import { formatTestResultResponse } from "../core/formatTestResultResponse.js";
import type { TaskResult } from "../core/taskOrchestrator.js";
import { TaskErrorType } from "../core/taskOrchestrator.js";
import type { TestFixOptions } from "../core/taskOptions.js";

describe("MCP test tool main logic", () => {
  it("returns build error and no test failures when build fails", async () => {
    // Load the build failure output from a file
    const fs = await import("node:fs");
    const path = await import("node:path");
    const buildFailureOutput = fs.readFileSync(path.join(__dirname, "mockData", "buildFailureOutput.txt"), "utf8");
    const { runTestsAndParseFailures } = await import("../core/testRunner.js");
    // Use a mock function for spawnAndCollectOutputImpl
    const mockSpawnAndCollectOutput = async (cmd: string) => ({ stdout: buildFailureOutput, stderr: "" });
    const options = { scheme: "TestScheme", xcodeproj: "TestProj.xcodeproj", xcworkspace: "TestWorkspace.xcworkspace", destination: "platform=iOS Simulator,name=iPhone 16" };
    const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
    expect(result.buildErrors.length).toBeGreaterThan(0);
    expect(result.buildErrors[0]).toContain("The following build commands failed:");
    expect(result.testFailures).toEqual([]);
  });

  const getValidation = (input: any) => ({ valid: !input.invalid, error: input.invalid ? "Invalid input" : undefined });

  const baseInput: TestFixOptions = {
    scheme: "TestScheme",
    xcodeproj: "TestProj.xcodeproj",
    xcworkspace: "TestWorkspace.xcworkspace",
    destination: "platform=iOS Simulator,name=iPhone 16"
  };

  it("returns validation error", () => {
    const input = { ...baseInput, invalid: true };
    const validation = getValidation(input);
    const res = formatTestResultResponse(input, validation, undefined);
    expect(res.content[0].text).toMatch(/Error: Invalid input/);
  });

  it("returns success result", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult<any> = { success: true, data: { foo: "bar" } };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toContain("✅ **All Tests Passed!**");
    expect(res.content[0].text).toContain("[object Object]"); // This is how { foo: "bar" } gets stringified
  });

  it("returns build errors", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult<string> = { success: false, error: TaskErrorType.BUILD_ERROR, buildErrors: ["B1", "B2"] };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/Build Errors Detected/);
    expect(res.content[0].text).toMatch(/B1/);
    expect(res.content[0].text).toMatch(/B2/);
  });

  it("handles various error types correctly", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);

    const errorTypes = [
      { error: TaskErrorType.MAX_RETRIES, expectedText: /Maximum Retry Attempts Exceeded/ },
      { error: TaskErrorType.MISSING_PROJECT, expectedText: /Project File Not Found/ },
      { error: TaskErrorType.UNKNOWN_ERROR, expectedText: /Unexpected Error[\s\S]*unknown-error/ }
    ];

    errorTypes.forEach(({ error, expectedText }) => {
      const result: TaskResult<string> = { success: false, error };
      const res = formatTestResultResponse(input, validation, result);
      expect(res.content[0].text).toMatch(expectedText);
    });
  });
});


