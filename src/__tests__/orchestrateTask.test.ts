import { describe, it, expect } from "vitest";
import { TaskErrorType } from "../core/taskOrchestrator.js";

describe("task error types", () => {
  it("should have expected error type constants", () => {
    // Verify error types are properly defined - this tests the actual enum values used throughout the system
    expect(TaskErrorType.UNKNOWN_ERROR).toBe("unknown-error");
    expect(TaskErrorType.BUILD_ERROR).toBe("build-error");
    expect(TaskErrorType.TEST_FAILURES).toBe("test-failures");
    expect(TaskErrorType.NEEDS_CONTEXT).toBe("needs-context");
    expect(TaskErrorType.MAX_RETRIES).toBe("max-retries");
    expect(TaskErrorType.MISSING_PROJECT).toBe("missing-project");
  });

  it("should provide comprehensive error type coverage for task scenarios", () => {
    const allErrorTypes = Object.values(TaskErrorType);
    
    // Verify we have coverage for the main failure scenarios
    expect(allErrorTypes).toContain("build-error");     // Build system failures
    expect(allErrorTypes).toContain("test-failures");   // Test execution failures  
    expect(allErrorTypes).toContain("needs-context");   // Additional info needed
    expect(allErrorTypes).toContain("max-retries");     // Retry limit exceeded
    expect(allErrorTypes).toContain("missing-project"); // Project file not found
    expect(allErrorTypes).toContain("unknown-error");   // Fallback for unexpected errors
    
    // Ensure we have reasonable coverage (6 main error types)
    expect(allErrorTypes.length).toBeGreaterThanOrEqual(6);
  });
});
