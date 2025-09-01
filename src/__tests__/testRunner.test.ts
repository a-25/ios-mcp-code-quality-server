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
import { TestFailureCategory, TestFailureSeverity } from "../core/testRunner.js";

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

  // Helper function to create a test failure from mock data - eliminates duplication
  const createTestFailureFromMock = (mockIndex: number = 0) => {
    const mockFailure = testFailureMock.issues.testFailureSummaries._values[mockIndex];
    const testIdentifier = mockFailure.testCaseName._value;
    const fileUrl = mockFailure.documentLocationInCreatingWorkspace.url._value;
    const lineMatch = fileUrl.match(/EndingLineNumber=(\d+)/);
    const line = lineMatch ? Number(lineMatch[1]) : undefined;
    const message = mockFailure.message._value;
    const suiteName = testIdentifier.split(".")[0];
    const file = fileUrl.split("#")[0].replace("file:///", "/");
    
    return {
      testIdentifier,
      suiteName,
      file,
      line,
      message,
      stack: "",
      attachments: [] as string[],
      severity: TestFailureSeverity.MEDIUM,
      category: TestFailureCategory.ASSERTION,
      isUITest: false
    };
  };

  it("returns validation error", () => {
    const input = { ...baseInput, invalid: true };
    const validation = getValidation(input);
    const res = formatTestResultResponse(input, validation, undefined);
    expect(res.content[0].text).toMatch(/Error: Invalid input/);
  });

  it("returns needsContext with build and test failures", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const testFailure = createTestFailureFromMock(0);
    const buildErrors = ["Build failed", "Linker error"];
    const result: TaskResult<string> = {
      success: false,
      error: TaskErrorType.NEEDS_CONTEXT,
      needsContext: true,
      message: "Need more info",
      buildErrors,
      testFailures: [testFailure]
    };
    const res = formatTestResultResponse(input, validation, result);
    const text = res.content[0].text;
    
    // Check all attributes are present and correct
    expect(text).toContain('Analysis Required');
    expect(text).toContain('Build Errors Found');
    expect(text).toContain(testFailure.testIdentifier);
    expect(text).toContain(testFailure.message);
    for (const err of buildErrors) {
      expect(text).toContain(err);
    }
    if (testFailure.line !== undefined) {
      expect(text).toContain(`Line: ${testFailure.line}`);
    }
  });

  it("returns test failures with proper formatting", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const testFailure = createTestFailureFromMock(1);
    const result: TaskResult<string> = {
      success: false,
      error: TaskErrorType.TEST_FAILURES,
      testFailures: [testFailure]
    };
    const res = formatTestResultResponse(input, validation, result);
    const text = res.content[0].text;
    
    // Check formatted output contains key elements
    expect(text).toContain("Test Failures Detected");
    expect(text).toContain(testFailure.testIdentifier);
    expect(text).toContain(testFailure.message);
    expect(text).toContain(`📁 Suite: ${testFailure.suiteName}`);
    expect(text).toContain(`📄 File: ${testFailure.file}`);
    if (testFailure.line !== undefined) {
      expect(text).toContain(`📍 Line: ${testFailure.line}`);
    }
  });

  it("returns success result", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult<any> = { success: true, data: { foo: "bar" } };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toContain("✅ **All Tests Passed!**");
    expect(res.content[0].text).toContain("[object Object]");
  });

  it("returns error for no result", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const res = formatTestResultResponse(input, validation, undefined);
    expect(res.content[0].text).toMatch(/Test Execution Error/);
  });

  it("handles different error types correctly", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    
    const errorTypes = [
      { error: TaskErrorType.BUILD_ERROR, expectedMatch: /Build System Error/ },
      { error: TaskErrorType.MISSING_PROJECT, expectedMatch: /Project File Not Found/ },
      { error: TaskErrorType.MAX_RETRIES, expectedMatch: /Maximum Retry Attempts Exceeded/ },
      { error: TaskErrorType.UNKNOWN_ERROR, expectedMatch: /Unexpected Error[\s\S]*unknown-error/ }
    ];

    errorTypes.forEach(({ error, expectedMatch }) => {
      const result: TaskResult<string> = { success: false, error };
      const res = formatTestResultResponse(input, validation, result);
      expect(res.content[0].text).toMatch(expectedMatch);
    });
  });

  it("returns build errors with proper formatting", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult<string> = { success: false, error: TaskErrorType.BUILD_ERROR, buildErrors: ["B1", "B2"] };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/Build Errors Detected/);
    expect(res.content[0].text).toMatch(/B1/);
    expect(res.content[0].text).toMatch(/B2/);
  });
});


