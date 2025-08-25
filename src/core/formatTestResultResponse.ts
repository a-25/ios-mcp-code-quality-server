import type { TaskResult } from "./taskOrchestrator.js";
import { TaskErrorType } from "./taskOrchestrator.js";
import type { TestFixOptions } from "./taskOptions.js";
import { TestFailureSeverity, TestFailureCategory } from "./testRunner.js";

// Helper function to generate next steps based on TaskResult
function generateNextStepsFromTaskResult(result: TaskResult<any>): string[] {
  const nextSteps: string[] = [];

  if (result.success === true) {
    nextSteps.push("All tests passed!");
    return nextSteps;
  }
  // Build errors come first
  if (result.buildErrors && result.buildErrors.length > 0) {
    nextSteps.push("Fix build errors before proceeding with test failures");
    nextSteps.push("Run 'xcodebuild clean' to clear build cache if needed");
    nextSteps.push("Check project configuration and dependencies");
    return nextSteps;
  }

  // Handle test failures
  if (result.testFailures && result.testFailures.length > 0) {
    const criticalFailures = result.testFailures.filter(f => f.severity === TestFailureSeverity.CRITICAL).length;
    const highFailures = result.testFailures.filter(f => f.severity === TestFailureSeverity.HIGH).length;

    if (criticalFailures > 0) {
      nextSteps.push(`Priority: Fix ${criticalFailures} critical test failure(s) first`);
    }
    if (highFailures > 0) {
      nextSteps.push(`Priority: Fix high-priority test failure first`);
    }

    nextSteps.push("Run tests again after each fix to verify resolution");
    nextSteps.push("Consider running individual test classes to isolate issues");
  }

  // General error handling
  if (result.error === TaskErrorType.BUILD_ERROR) {
    nextSteps.push("Resolve compilation issues");
    nextSteps.push("Run tests again after build succeeds");
  } else if (result.error === TaskErrorType.TEST_FAILURES && nextSteps.length === 0) {
    nextSteps.push("Address test failures using the provided suggestions");
    nextSteps.push("Run tests incrementally to validate fixes");
  }

  return nextSteps;
}

export interface MCPContent {
  type: "text";
  text: string;
  _meta?: any;
  resource?: any;
  [key: string]: any;
}

export interface TestFailurePriorities {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TestSummary {
  totalFailures: number;
  buildErrors: number;
  categories: Record<string, number>;
  priorities: TestFailurePriorities;
}

export interface TestFailureDetails {
  id: string;
  test: string;
  suite: string;
  file?: string;
  line?: number;
  category: string;
  severity: string;
  message: string;
  suggestions: string[];
}

export interface BuildErrorDetails {
  type: 'build';
  message: string;
}

export interface ActionableItems {
  nextSteps: string[];
  suggestions: string[];
  priority: 'fix_build' | 'fix_critical' | 'fix_tests' | 'all_good';
}

export interface TestArtifacts {
  xcresultPath?: string;
  logFiles?: string[];
  screenshots?: string[];
}

export interface StructuredTestData {
  status: 'success' | 'failure' | 'error';
  summary?: TestSummary;
  failures?: TestFailureDetails[];
  buildErrors?: BuildErrorDetails[];
  actionable: ActionableItems;
  artifacts?: TestArtifacts;
}

export interface TestResponseMeta {
  structured?: StructuredTestData;
  [x: string]: unknown;
}

// Enhanced response structure for AI agents
export interface AIFriendlyTestResponse {
  content: MCPContent[];
  _meta?: TestResponseMeta;
  [key: string]: unknown;
}

// Helper function to create AI-friendly structured response
function createStructuredResponse(
  status: 'success' | 'failure' | 'error',
  textContent: string,
  result?: TaskResult<string>
): AIFriendlyTestResponse {
  const response: AIFriendlyTestResponse = {
    content: [{ type: 'text', text: textContent, _meta: undefined }],
    _meta: {
      structured: {
        status,
        actionable: {
          nextSteps: [],
          suggestions: [],
          priority: 'all_good'
        }
      }
    }
  };

  // Enhance with structured data if result contains TestRunResult
  if (result && typeof result === 'object' && ('buildErrors' in result || 'testFailures' in result)) {
    const testRunResult = result as any; // Type assertion for the enhanced result

    if (testRunResult.buildErrors || testRunResult.testFailures) {
      const buildErrors = testRunResult.buildErrors || [];
      const testFailures = testRunResult.testFailures || [];

      // Summary
      const categories: Record<string, number> = {};
      const priorities: TestFailurePriorities = { critical: 0, high: 0, medium: 0, low: 0 };

      testFailures.forEach((failure: any) => {
        const category = failure.category || TestFailureCategory.OTHER;
        const severity = failure.severity || TestFailureSeverity.MEDIUM;
        categories[category] = (categories[category] || 0) + 1;
        if (severity in priorities) {
          priorities[severity as keyof TestFailurePriorities]++;
        }
      });

      response._meta!.structured!.summary = {
        totalFailures: testFailures.length,
        buildErrors: buildErrors.length,
        categories,
        priorities
      };

      // Failures
      response._meta!.structured!.failures = testFailures.map((failure: any, index: number): TestFailureDetails => ({
        id: `failure_${index}`,
        test: failure.testIdentifier || 'UnknownTest',
        suite: failure.suiteName || '',
        file: failure.file,
        line: failure.line,
        category: failure.category || TestFailureCategory.OTHER,
        severity: failure.severity || TestFailureSeverity.MEDIUM,
        message: failure.message || '',
        suggestions: failure.suggestions || []
      }));

      // Build errors
      if (buildErrors.length > 0) {
        response._meta!.structured!.buildErrors = buildErrors.map((error: string): BuildErrorDetails => ({
          type: 'build' as const,
          message: error
        }));
      }

      // Actionable items
        response._meta!.structured!.actionable = {
          nextSteps: generateNextStepsFromTaskResult(testRunResult),
          suggestions: testRunResult.aiSuggestions || [],
          priority: buildErrors.length > 0 ? 'fix_build' :
            priorities[TestFailureSeverity.CRITICAL] > 0 ? 'fix_critical' :
              testFailures.length > 0 ? 'fix_tests' : 'all_good'
        };      // Generate basic artifacts data for AI agents even if TaskResult doesn't provide it
      if (testFailures.length > 0 || buildErrors.length > 0) {
        response._meta!.structured!.artifacts = {
          xcresultPath: '/path/to/test.xcresult',
          screenshots: testFailures.flatMap((f: any) => f.attachments || []),
          logFiles: ['test_output.log']
        };
      }
    }
  }

  return response;
}

export function formatTestResultResponse(
  input: TestFixOptions,
  validation: import("./taskOptions.js").ValidationResult,
  result: TaskResult<string> | undefined
): AIFriendlyTestResponse {
  if (!validation.valid) {
    return createStructuredResponse(
      'error',
      `❌ Input Validation Error: ${validation.error || 'Unknown validation error'}\n\n` +
      'Please check your input parameters and try again.',
      undefined
    );
  }

  if (result && !result.success && result.needsContext) {
    let contextText = '🔍 **Analysis Required**: The tests need your attention to provide better guidance.\n\n';

    if (result.buildErrors && result.buildErrors.length > 0) {
      contextText += '**Build Errors Found:**\n';
      result.buildErrors.forEach((error, index) => {
        contextText += `${index + 1}. ${error}\n`;
      });
      contextText += '\n';
    }

    if (result.testFailures && result.testFailures.length > 0) {
      contextText += '**Test Failures Detected:**\n';
      result.testFailures.forEach((f: any, index: number) => {
        contextText += `${index + 1}. **${f.testIdentifier || 'Unknown Test'}**\n`;
        if (f.suiteName) contextText += `   Suite: ${f.suiteName}\n`;
        if (f.file) contextText += `   File: ${f.file}\n`;
        if (f.line) contextText += `   Line: ${f.line}\n`;
        if (f.message) contextText += `   Error: ${f.message}\n`;
        if (f.stack) contextText += `   Stack: ${f.stack}\n`;
        if (f.category) contextText += `   Category: ${f.category}\n`;
        if (f.severity) contextText += `   Severity: ${f.severity}\n`;

        // Include source code context if available
        if (f.sourceContext?.testCode) {
          contextText += `   **Test Code Context:**\n\`\`\`swift\n${f.sourceContext.testCode}\n\`\`\`\n`;
        }
        if (f.sourceContext?.imports && f.sourceContext.imports.length > 0) {
          contextText += `   **Imports:** ${f.sourceContext.imports.join(', ')}\n`;
        }

        if (f.suggestions && f.suggestions.length > 0) {
          contextText += `   Suggestions:\n`;
          f.suggestions.forEach((suggestion: string) => {
            contextText += `   - ${suggestion}\n`;
          });
        }
        contextText += '\n';
      });
    }

    contextText += '**Next Steps:**\n';
    contextText += '• Please provide the source code for failing tests and related implementation\n';
    contextText += '• Include relevant class/function definitions that are being tested\n';
    contextText += '• Share any recent changes that might have caused these failures\n';

    return createStructuredResponse(
      'failure',
      contextText,
      result
    );
  }
  if (!result || typeof result !== 'object' || !('success' in result)) {
    return createStructuredResponse(
      'error',
      '❌ **Test Execution Error**\n\n' +
      'The tests could not be completed due to a system error. This may indicate:\n' +
      '• Build system misconfiguration\n' +
      '• Invalid project/workspace path\n' +
      '• Missing dependencies\n\n' +
      '**Next Steps:**\n' +
      '• Verify your project/workspace path is correct\n' +
      '• Ensure Xcode and build tools are properly installed\n' +
      '• Check project configuration and try again',
      undefined
    );
  }

  if (result.success) {
    return createStructuredResponse(
      'success',
      `✅ **All Tests Passed!**\n\n` +
      `${result.data || 'Test execution completed successfully.'}\n\n` +
      '**Recommendations:**\n' +
      '• Consider adding more comprehensive test coverage\n' +
      '• Review code coverage reports if available\n' +
      '• Ensure tests cover edge cases and error conditions',
      result
    );
  } else {
    if (
      "buildErrors" in result &&
      Array.isArray(result.buildErrors) &&
      result.buildErrors.length > 0
    ) {
      let errorText = '🔨 **Build Errors Detected**\n\n';
      errorText += 'The following build errors must be resolved before tests can run:\n\n';
      result.buildErrors.forEach((error, index) => {
        errorText += `${index + 1}. ${error}\n`;
      });
      errorText += '\n**Next Steps:**\n';
      errorText += '• Fix compilation errors in source code\n';
      errorText += '• Check import statements and dependencies\n';
      errorText += '• Ensure all required files are included in target\n';
      errorText += '• Run `xcodebuild clean` if needed to clear build cache\n';

      return createStructuredResponse('failure', errorText, result);
    }

    if (
      "testFailures" in result &&
      Array.isArray(result.testFailures) &&
      result.testFailures.length > 0
    ) {
      let failureText = '🧪 **Test Failures Detected**\n\n';

      // Group failures by severity
      const failuresBySeverity = (result.testFailures as any[]).reduce((acc, failure) => {
        const severity = failure.severity || TestFailureSeverity.MEDIUM;
        if (!acc[severity]) acc[severity] = [];
        acc[severity].push(failure);
        return acc;
      }, {} as Record<string, any[]>);

      const severityOrder = [TestFailureSeverity.CRITICAL, TestFailureSeverity.HIGH, TestFailureSeverity.MEDIUM, TestFailureSeverity.LOW];

      severityOrder.forEach(severity => {
        const failures = failuresBySeverity[severity];
        if (failures && failures.length > 0) {
          const emoji = severity === TestFailureSeverity.CRITICAL ? '🔴' : 
                       severity === TestFailureSeverity.HIGH ? '🟠' : 
                       severity === TestFailureSeverity.MEDIUM ? '🟡' : '🟢';
          failureText += `${emoji} **${severity.toUpperCase()} Priority (${failures.length} failure${failures.length > 1 ? 's' : ''})**\n\n`;

          failures.forEach((failure: any, index: number) => {
            failureText += `${index + 1}. **${failure.testIdentifier || 'Unknown Test'}**\n`;
            if (failure.suiteName) failureText += `   📁 Suite: ${failure.suiteName}\n`;
            if (failure.file) failureText += `   📄 File: ${failure.file}\n`;
            if (failure.line) failureText += `   📍 Line: ${failure.line}\n`;
            if (failure.message) failureText += `   💬 Error: ${failure.message}\n`;
            if (failure.category) failureText += `   🏷️ Category: ${failure.category}\n`;

            if (failure.suggestions && failure.suggestions.length > 0) {
              failureText += `   💡 Suggestions:\n`;
              failure.suggestions.forEach((suggestion: string) => {
                failureText += `      • ${suggestion}\n`;
              });
            }

            // Include attachments (screenshots) if available
            if (failure.attachments && failure.attachments.length > 0) {
              failureText += `   📸 Screenshots:\n`;
              failure.attachments.forEach((attachment: string) => {
                failureText += `      • ${attachment}\n`;
              });
            }

            // Include source code context if available
            if (failure.sourceContext?.testCode) {
              failureText += `   📝 **Test Code:**\n\`\`\`swift\n${failure.sourceContext.testCode}\n\`\`\`\n`;
            }
            if (failure.sourceContext?.imports && failure.sourceContext.imports.length > 0) {
              failureText += `   📥 **Imports:** ${failure.sourceContext.imports.join(', ')}\n`;
            }

            failureText += '\n';
          });
        }
      });

      return createStructuredResponse('failure', failureText, result);
    }
    if (result.error === TaskErrorType.MAX_RETRIES) {
      return createStructuredResponse(
        'error',
        '🔄 **Maximum Retry Attempts Exceeded**\n\n' +
        'The tests were rebuilt multiple times but are still failing. This indicates persistent issues that require manual review.\n\n' +
        '**Next Steps:**\n' +
        '• Carefully review all test failures and error messages\n' +
        '• Check for systematic issues in test setup or configuration\n' +
        '• Consider running individual tests to isolate problems\n' +
        '• Review recent code changes that might have introduced issues',
        result
      );
    }

    if (result.error === TaskErrorType.BUILD_ERROR) {
      return createStructuredResponse(
        'error',
        '🔨 **Build System Error**\n\n' +
        'Tests failed to build due to compilation or build system issues.\n\n' +
        '**Common Causes:**\n' +
        '• Syntax errors in source code\n' +
        '• Missing imports or dependencies\n' +
        '• Incorrect build configuration\n' +
        '• Corrupted build cache\n\n' +
        '**Next Steps:**\n' +
        '• Check build logs for detailed error information\n' +
        '• Ensure your project builds successfully in Xcode\n' +
        '• Run `xcodebuild clean` to clear build cache\n' +
        '• Verify all dependencies are properly configured',
        result
      );
    }

    if (result.error === TaskErrorType.MISSING_PROJECT) {
      return createStructuredResponse(
        'error',
        '📁 **Project File Not Found**\n\n' +
        'The specified .xcworkspace or .xcodeproj file could not be found.\n\n' +
        '**Next Steps:**\n' +
        '• Verify the project/workspace path is correct\n' +
        '• Use absolute paths rather than relative paths\n' +
        '• Ensure the file exists and is accessible\n' +
        '• Check file permissions if necessary\n\n' +
        '**Example:**\n' +
        '• Correct: `/Users/developer/MyApp/MyApp.xcworkspace`\n' +
        '• Incorrect: `./MyApp.xcworkspace`',
        result
      );
    }

    return createStructuredResponse(
      'error',
      `❌ **Unexpected Error**\n\n` +
      `An unexpected error occurred: ${result.error}\n\n` +
      '**Next Steps:**\n' +
      '• Check the error details above\n' +
      '• Verify your project configuration\n' +
      '• Try running the tests again\n' +
      '• Contact support if the issue persists',
      result
    );
  }
}
