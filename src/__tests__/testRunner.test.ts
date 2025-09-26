import { describe, it, expect } from "vitest";
import { formatTestResultResponse } from "../core/formatTestResultResponse.js";
import type { TaskResult } from "../core/taskOrchestrator.js";
import { TaskErrorType } from "../core/taskOrchestrator.js";
import type { TestFixOptions } from "../core/taskOptions.js";
import { TestFailureCategory, TestFailureSeverity } from "../core/testRunner.js";

// Test Response Formatting - Core Business Logic
// This tests the actual business logic of formatting responses for AI agents,
// not mocked implementations or shell command execution.
describe("Test Result Response Formatting", () => {
  const getValidation = (input: any) => ({ 
    valid: !input.invalid, 
    error: input.invalid ? "Invalid input" : undefined 
  });

  const baseInput: TestFixOptions = {
    scheme: "TestScheme",
    xcodeproj: "TestProj.xcodeproj",
    destination: "platform=iOS Simulator,name=iPhone 16"
  };

  // Simple test failure for focused testing
  const createTestFailure = (overrides = {}) => ({
    testIdentifier: "MyTests.testExample",
    suiteName: "MyTests",
    file: "/path/to/MyTests.swift",
    line: 42,
    message: "XCTAssertEqual failed: (actual) is not equal to (expected)",
    stack: "Stack trace here",
    attachments: [],
    severity: TestFailureSeverity.MEDIUM,
    category: TestFailureCategory.ASSERTION,
    isUITest: false,
    ...overrides
  });

  it("formats validation errors correctly", () => {
    const input = { ...baseInput, invalid: true };
    const validation = getValidation(input);
    const res = formatTestResultResponse(input, validation, undefined);
    
    expect(res.content[0].text).toMatch(/Error: Invalid input/);
  });

  it("formats context request with build and test failures", () => {
    const testFailure = createTestFailure();
    const buildErrors = ["Build failed", "Linker error"];
    
    const result: TaskResult<string> = {
      success: false,
      error: TaskErrorType.NEEDS_CONTEXT,
      needsContext: true,
      message: "Need more info",
      buildErrors,
      testFailures: [testFailure]
    };
    
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    const text = res.content[0].text;
    
    // Verify structured analysis request format
    expect(text).toContain('Analysis Required');
    expect(text).toContain('Build Errors Found');
    expect(text).toContain(testFailure.testIdentifier);
    expect(text).toContain(`Line: ${testFailure.line}`);
    expect(text).toContain(`Error: ${testFailure.message}`);
    
    buildErrors.forEach(err => {
      expect(text).toContain(err);
    });
  });

  it("handles missing result gracefully", () => {
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), undefined);
    expect(res.content[0].text).toMatch(/Test Execution Error/);
  });

  it("formats successful test results", () => {
    const result: TaskResult<string> = { 
      success: true, 
      data: "All 15 tests passed successfully!" 
    };
    
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    
    expect(res.content[0].text).toContain("✅ **All Tests Passed!**");
    expect(res.content[0].text).toContain("All 15 tests passed successfully!");
  });

  it("formats build error responses", () => {
    const result: TaskResult<string> = { 
      success: false, 
      error: TaskErrorType.BUILD_ERROR, 
      buildErrors: ["Compilation failed", "Missing dependency"] 
    };
    
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    const text = res.content[0].text;
    
    expect(text).toMatch(/Build Errors Detected/);
    expect(text).toContain("Compilation failed");
    expect(text).toContain("Missing dependency");
  });

  it("formats test failure responses with all required fields", () => {
    const testFailure = createTestFailure({
      testIdentifier: "LoginTests.testInvalidCredentials",
      suiteName: "LoginTests",
      file: "/src/LoginTests.swift",
      line: 55,
      message: "XCTAssertFalse failed: Login should fail with invalid credentials"
    });
    
    const result: TaskResult<string> = {
      success: false,
      error: TaskErrorType.TEST_FAILURES,
      testFailures: [testFailure]
    };
    
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    const text = res.content[0].text;
    
    // Verify all essential fields are present in formatted output
    expect(text).toContain("Test Failures Detected");
    expect(text).toContain("LoginTests.testInvalidCredentials");
    expect(text).toContain("📁 Suite: LoginTests");
    expect(text).toContain("📄 File: /src/LoginTests.swift");
    expect(text).toContain("📍 Line: 55");
    expect(text).toContain("💬 Error: XCTAssertFalse failed");
  });

  // Test specific error types for completeness
  it("formats max retries error", () => {
    const result: TaskResult<string> = { success: false, error: TaskErrorType.MAX_RETRIES };
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    expect(res.content[0].text).toMatch(/Maximum Retry Attempts Exceeded/);
  });

  it("formats missing project error", () => {
    const result: TaskResult<string> = { success: false, error: TaskErrorType.MISSING_PROJECT };
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    expect(res.content[0].text).toMatch(/Project File Not Found/);
  });

  it("formats unknown error with fallback", () => {
    const result: TaskResult<string> = { success: false, error: TaskErrorType.UNKNOWN_ERROR };
    const res = formatTestResultResponse(baseInput, getValidation(baseInput), result);
    expect(res.content[0].text).toMatch(/Unexpected Error[\s\S]*unknown-error/);
  });
});
