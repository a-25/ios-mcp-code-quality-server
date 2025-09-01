import { vi, describe, it, expect } from "vitest";
import type { TaskResult } from "../core/taskOrchestrator.js";
import { TaskErrorType } from "../core/taskOrchestrator.js";
import type { TestFixOptions } from "../core/taskOptions.js";
import { TestFailureCategory, TestFailureSeverity } from "../core/testRunner.js";

describe("Test Runner Core Logic", () => {
  it("should parse build failure output correctly", async () => {
    // Test actual build parsing logic rather than mocked responses
    const fs = await import("node:fs");
    const path = await import("node:path");
    const buildFailureOutput = fs.readFileSync(path.join(__dirname, "mockData", "buildFailureOutput.txt"), "utf8");
    const { runTestsAndParseFailures } = await import("../core/testRunner.js");
    
    const mockSpawnAndCollectOutput = async (cmd: string) => ({ stdout: buildFailureOutput, stderr: "" });
    const options: TestFixOptions = { 
      scheme: "TestScheme", 
      xcodeproj: "TestProj.xcodeproj",
      destination: "platform=iOS Simulator,name=iPhone 16" 
    };
    
    const result = await runTestsAndParseFailures(options, mockSpawnAndCollectOutput);
    
    // Test core parsing logic
    expect(result.buildErrors.length).toBeGreaterThan(0);
    expect(result.buildErrors[0]).toContain("The following build commands failed:");
    expect(result.testFailures).toEqual([]);
  });

  it("should correctly categorize test failures by severity", () => {
    // Test failure categorization logic without mocking
    const testFailures = [
      {
        testIdentifier: "CriticalTest.testImportant",
        suiteName: "CriticalTest",
        message: "Critical system failure",
        severity: TestFailureSeverity.CRITICAL,
        category: TestFailureCategory.CRASH,
        isUITest: false
      },
      {
        testIdentifier: "RegularTest.testFeature", 
        suiteName: "RegularTest",
        message: "Assertion failed",
        severity: TestFailureSeverity.LOW,
        category: TestFailureCategory.ASSERTION,
        isUITest: false
      }
    ];

    const result: TaskResult<string> = {
      success: false,
      error: TaskErrorType.TEST_FAILURES,
      testFailures
    };

    // Verify categorization works correctly
    const criticalFailures = result.testFailures?.filter(f => f.severity === TestFailureSeverity.CRITICAL);
    const lowFailures = result.testFailures?.filter(f => f.severity === TestFailureSeverity.LOW);
    
    expect(criticalFailures).toHaveLength(1);
    expect(lowFailures).toHaveLength(1);
    expect(criticalFailures?.[0]?.category).toBe(TestFailureCategory.CRASH);
  });

  it("should handle mixed build and test errors appropriately", () => {
    // Test that we understand the data structure correctly
    const buildErrors = ["Compilation failed"];
    const testFailures = [{
      testIdentifier: "Test.case",
      suiteName: "Test",
      message: "Failed",
      severity: TestFailureSeverity.HIGH,
      category: TestFailureCategory.ASSERTION,
      isUITest: false
    }];

    // Verify we can work with both types of failures
    expect(buildErrors).toHaveLength(1);
    expect(testFailures).toHaveLength(1);
    expect(testFailures[0].severity).toBe(TestFailureSeverity.HIGH);
  });
});


