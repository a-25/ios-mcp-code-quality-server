
// import testFailureMock from './mockData/testFailureMock.json' with { type: 'json' };
import testFailureMock from "./mockData/testFailureMock.json" with { type: "json" };
import { vi } from "vitest";

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

  const baseFailure = {
    testIdentifier: "T2",
    suiteName: "Suite",
    file: "file.swift",
    line: 42,
    message: "fail",
    stack: "stack",
    attachments: []
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
    // Use the first test failure from the mock
    const mockFailure = testFailureMock.issues.testFailureSummaries._values[0];
    // Extract real fields from the mock
    const testIdentifier = mockFailure.testCaseName._value;
    const fileUrl = mockFailure.documentLocationInCreatingWorkspace.url._value;
    const lineMatch = fileUrl.match(/EndingLineNumber=(\d+)/);
    const line = lineMatch ? Number(lineMatch[1]) : undefined;
    const message = mockFailure.message._value;
    const suiteName = testIdentifier.split(".")[0];
    const file = fileUrl.split("#")[0].replace("file:///", "/");
    const stack = "";
    const attachments: string[] = [];
    const testFailure = {
      testIdentifier,
      suiteName,
      file,
      line,
      message,
      stack,
      attachments
    };
    const buildErrors = ["Build failed", "Linker error"];
    const result: TaskResult = {
      success: false,
      error: "needs-context",
      needsContext: true,
      message: "Need more info",
      buildErrors,
      testFailures: [testFailure]
    };
    const res = formatTestResultResponse(input, validation, result);
    const text = res.content[0].text;
    // Check all attributes are present and correct
    expect(text).toContain("Incomplete context");
    expect(text).toContain("Need more info");
    for (const err of buildErrors) {
      expect(text).toContain(err);
    }
    expect(text).toContain(`- ${testFailure.testIdentifier}`);
    // The output does not include 'Suite: ...' or 'File: ...' for needsContext, only testIdentifier, message, etc.
    if (testFailure.line !== undefined) {
      expect(text).toContain(`Line: ${testFailure.line}`);
    }
    expect(text).toContain(`Message: ${testFailure.message}`);
    if (testFailure.stack) {
      expect(text).toContain(`Stack: ${testFailure.stack}`);
    }
    // Ensure nothing is missing
    const expectedFields = [
      testFailure.testIdentifier,
      testFailure.line !== undefined ? String(testFailure.line) : undefined,
      testFailure.message,
      testFailure.stack || undefined,
      ...buildErrors
    ].filter(Boolean);
    for (const field of expectedFields) {
      expect(text).toContain(field);
    }
  });

  it("returns error for no result", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const res = formatTestResultResponse(input, validation, undefined);
    expect(res.content[0].text).toMatch(/Tests could not be completed/);
  });

  it("returns success result", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: true, data: { foo: "bar" } };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toBe(JSON.stringify({ foo: "bar" }));
  });

  it("returns build errors", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: false, error: "build-error", buildErrors: ["B1", "B2"] };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/Build errors occurred/);
    expect(res.content[0].text).toMatch(/B1/);
    expect(res.content[0].text).toMatch(/B2/);
  });

  it("returns test failures", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    // Use the second test failure from the mock
    const mockFailure = testFailureMock.issues.testFailureSummaries._values[1];
    // Extract real fields from the mock
    const testIdentifier = mockFailure.testCaseName._value;
    const fileUrl = mockFailure.documentLocationInCreatingWorkspace.url._value;
    const lineMatch = fileUrl.match(/EndingLineNumber=(\d+)/);
    const line = lineMatch ? Number(lineMatch[1]) : undefined;
    const message = mockFailure.message._value;
    const suiteName = testIdentifier.split(".")[0];
    const file = fileUrl.split("#")[0].replace("file:///", "/");
    const stack = "";
    const attachments: string[] = [];
    const testFailure = {
      testIdentifier,
      suiteName,
      file,
      line,
      message,
      stack,
      attachments
    };
    const result: TaskResult = {
      success: false,
      error: "test-failures",
      testFailures: [testFailure]
    };
    const res = formatTestResultResponse(input, validation, result);
    const text = res.content[0].text;
    // Check all attributes are present and correct
    expect(text).toContain("Test failures");
    expect(text).toContain(`- ${testFailure.testIdentifier}`);
    expect(text).toContain(`: ${testFailure.message}`);
    // The output includes a JSON dump, so check for the JSON fields as well
    expect(text).toContain(`"testIdentifier": "${testFailure.testIdentifier}"`);
    expect(text).toContain(`"suiteName": "${testFailure.suiteName}"`);
    expect(text).toContain(`"file": "${testFailure.file}"`);
    if (testFailure.line !== undefined) {
      expect(text).toContain(`"line": ${testFailure.line}`);
    }
    // Escape double quotes in the message for JSON output
    const escapedMessage = testFailure.message.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    expect(text).toContain(`"message": "${escapedMessage}"`);
    // Ensure nothing is missing
    const expectedFields = [
      testFailure.testIdentifier,
      testFailure.message,
      testFailure.suiteName,
      testFailure.file,
      testFailure.line !== undefined ? String(testFailure.line) : undefined
    ].filter(Boolean);
    for (const field of expectedFields) {
      expect(text).toContain(field);
    }
  });

  enum TestErrorType {
    MaxRetries = "max-retries",
    BuildError = "build-error",
    MissingProject = "missing-project",
    OtherError = "other-error",
  }

  it("returns max-retries error", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: false, error: TestErrorType.MaxRetries };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/maximum number of times/);
  });

  it("returns build-error error", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: false, error: TestErrorType.BuildError };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/Tests failed to build/);
  });

  it("returns missing-project error", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: false, error: TestErrorType.MissingProject };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/missing or was not found/);
  });

  it("returns fallback error", () => {
    const input = { ...baseInput };
    const validation = getValidation(input);
    const result: TaskResult = { success: false, error: TestErrorType.OtherError };
    const res = formatTestResultResponse(input, validation, result);
    expect(res.content[0].text).toMatch(/Error: other-error/);
  });
});


