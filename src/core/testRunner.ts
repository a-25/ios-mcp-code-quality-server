import { TestFixOptions } from "./taskOptions.js";
import { exec } from "child_process";
import util from "util";
import fs from "fs-extra";
import { spawnAndCollectOutput, SpawnOutputResult } from "../utils/spawnAndCollectOutput.js";
import { enhanceTestFailuresWithSourceContext, extractProjectRoot } from "./sourceCodeContext.js";

export enum TestFailureSeverity {
  CRITICAL = 'critical',
  HIGH = 'high', 
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TestFailureCategory {
  ASSERTION = 'assertion',
  CRASH = 'crash',
  TIMEOUT = 'timeout',
  BUILD = 'build',
  SETUP = 'setup',
  TEARDOWN = 'teardown',
  OTHER = 'other'
}

export interface TestSourceContext {
  testCode?: string;
  relatedCode?: string;
  imports?: string[];
}

export interface ExecAsyncResult {
  stdout: string;
}

async function cleanupRunDir(runDir: string): Promise<void> {
  try {
    await fs.rm(runDir, { recursive: true, force: true });
  } catch { }
}

// Helper function to categorize test failures
function categorizeFailure(failure: TestFailure): { category: TestFailureCategory; severity: TestFailureSeverity } {
  const message = (failure.message || '').toLowerCase();
  const stack = (failure.stack || '').toLowerCase();
  const combined = `${message} ${stack}`;

  // Determine category
  let category: TestFailureCategory = TestFailureCategory.OTHER;
  if (combined.includes('assertion') || combined.includes('expect') || combined.includes('assert')) {
    category = TestFailureCategory.ASSERTION;
  } else if (combined.includes('crash') || combined.includes('sigabrt') || combined.includes('signal')) {
    category = TestFailureCategory.CRASH;
  } else if (combined.includes('timeout') || combined.includes('timed out')) {
    category = TestFailureCategory.TIMEOUT;
  } else if (combined.includes('build') || combined.includes('compile')) {
    category = TestFailureCategory.BUILD;
  } else if (combined.includes('setup') || combined.includes('before')) {
    category = TestFailureCategory.SETUP;
  } else if (combined.includes('teardown') || combined.includes('after')) {
    category = TestFailureCategory.TEARDOWN;
  }

  // Determine severity
  let severity: TestFailureSeverity = TestFailureSeverity.MEDIUM;
  if (category === TestFailureCategory.CRASH || combined.includes('fatal') || combined.includes('abort')) {
    severity = TestFailureSeverity.CRITICAL;
  } else if (category === TestFailureCategory.BUILD || category === TestFailureCategory.SETUP || combined.includes('error')) {
    severity = TestFailureSeverity.HIGH;
  } else if (category === TestFailureCategory.TIMEOUT || combined.includes('warning')) {
    severity = TestFailureSeverity.LOW;
  }

  return { category, severity };
}

// Helper function to generate actionable suggestions for test failures
function generateFailureSuggestions(failure: TestFailure): string[] {
  const suggestions: string[] = [];
  const message = (failure.message || '').toLowerCase();
  const category = failure.category || TestFailureCategory.OTHER;

  switch (category) {
    case TestFailureCategory.ASSERTION:
      suggestions.push("Review the assertion logic and expected vs actual values");
      suggestions.push("Check if the test data setup is correct");
      suggestions.push("Verify the test expectations match the actual behavior");
      break;
    case TestFailureCategory.CRASH:
      suggestions.push("Check for nil pointer dereferences or memory issues");
      suggestions.push("Review stack trace for the exact crash location");
      suggestions.push("Add null checks and defensive programming");
      break;
    case TestFailureCategory.TIMEOUT:
      suggestions.push("Increase timeout values if the operation is legitimately slow");
      suggestions.push("Check for infinite loops or blocking operations");
      suggestions.push("Use async/await patterns properly in tests");
      break;
    case TestFailureCategory.BUILD:
      suggestions.push("Fix compilation errors in test or source code");
      suggestions.push("Check import statements and module dependencies");
      suggestions.push("Ensure all required files are included in the target");
      break;
    case TestFailureCategory.SETUP:
    case TestFailureCategory.TEARDOWN:
      suggestions.push("Review test setup and cleanup code");
      suggestions.push("Ensure proper initialization of test dependencies");
      suggestions.push("Check for resource cleanup issues");
      break;
    default:
      suggestions.push("Examine the error message and stack trace carefully");
      suggestions.push("Add debugging statements to understand the failure");
      suggestions.push("Consider breaking down the test into smaller parts");
  }

  // Add specific suggestions based on message content
  if (message.includes('nil') || message.includes('null')) {
    suggestions.push("Add nil/null checks before using optional values");
  }
  if (message.includes('index') || message.includes('range')) {
    suggestions.push("Verify array bounds and index calculations");
  }
  if (message.includes('network') || message.includes('url')) {
    suggestions.push("Check network connectivity and URL validity in tests");
  }

  return suggestions;
}

// Helper function to generate overall suggestions for the test run
function generateTestRunSuggestions(result: TestRunResult): string[] {
  const suggestions: string[] = [];
  
  if (result.buildErrors.length > 0) {
    suggestions.push("Resolve all build errors before addressing test failures");
    suggestions.push("Check project configuration and dependencies");
    suggestions.push("Verify all source files compile successfully");
  }
  
  if (result.testFailures.length > 0) {
    const categories = result.testFailures.reduce((acc, failure) => {
      const category = failure.category || TestFailureCategory.OTHER;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<TestFailureCategory, number>);
    
    Object.entries(categories).forEach(([category, count]) => {
      suggestions.push(`Address ${count} ${category} failure${count > 1 ? 's' : ''}`);
    });
    
    if (categories[TestFailureCategory.CRASH]) {
      suggestions.push("Priority: Fix crash issues first as they may mask other problems");
    }
    if (categories[TestFailureCategory.BUILD]) {
      suggestions.push("Fix build-related test failures to ensure clean compilation");
    }
  }
  
  if (result.testFailures.length === 0 && result.buildErrors.length === 0) {
    suggestions.push("All tests are passing - consider adding more comprehensive test coverage");
  }
  
  return suggestions;
}

// Helper function to generate next steps for the overall test run
function generateNextSteps(result: TestRunResult): string[] {
  const nextSteps: string[] = [];
  
  if (result.buildErrors.length > 0) {
    nextSteps.push("Fix build errors before proceeding with test failures");
    nextSteps.push("Run 'xcodebuild clean' to clear build cache if needed");
    nextSteps.push("Check project configuration and dependencies");
  }
  
  if (result.testFailures.length > 0) {
    const criticalFailures = result.testFailures.filter(f => f.severity === TestFailureSeverity.CRITICAL).length;
    const highFailures = result.testFailures.filter(f => f.severity === TestFailureSeverity.HIGH).length;
    
    if (criticalFailures > 0) {
      nextSteps.push(`Priority: Fix ${criticalFailures} critical test failure(s) first`);
    }
    if (highFailures > 0) {
      nextSteps.push(`Then address ${highFailures} high-priority test failure(s)`);
    }
    
    nextSteps.push("Run tests again after each fix to verify resolution");
    nextSteps.push("Consider running individual test classes to isolate issues");
  }
  
  if (result.artifacts?.xcresultPath) {
    nextSteps.push(`Review detailed test results in: ${result.artifacts.xcresultPath}`);
  }
  
  if (result.testFailures.length === 0 && result.buildErrors.length === 0) {
    nextSteps.push("All tests passed!");
  }
  
  return nextSteps;
}
export type TestFailure = {
  testIdentifier: string;
  suiteName: string;
  file?: string;
  line?: number;
  message?: string;
  stack?: string;
  attachments?: string[]; // paths to screenshots
  // Enhanced fields for AI agent support
  severity?: TestFailureSeverity | 'critical' | 'high' | 'medium' | 'low';
  category?: TestFailureCategory | 'assertion' | 'crash' | 'timeout' | 'build' | 'setup' | 'teardown' | 'other';
  sourceContext?: TestSourceContext;
  suggestions?: string[];
  duration?: number; // test duration in seconds
  platform?: string; // iOS version, simulator name, etc.
};

async function parseXcresultForFailures(xcresultPath: string): Promise<TestFailure[]> {
  const failures: TestFailure[] = [];
  function collectFailuresFromSubtests(subtests: any[], suiteName: string) {
    for (const testCase of subtests) {
      // If this is a test suite, recurse
      if (testCase.subtests && Array.isArray(testCase.subtests._values) && testCase.subtests._values.length > 0) {
        collectFailuresFromSubtests(testCase.subtests._values, testCase.name || suiteName);
      } else if (testCase.status === "Failure") {
        const attachments: string[] = [];
        if (testCase.attachments && testCase.attachments._values) {
          for (const att of testCase.attachments._values) {
            if (att.filename && att.filename.endsWith(".png")) {
              attachments.push(att.filename);
            }
          }
        }
        const baseFailure: TestFailure = {
          testIdentifier: testCase.identifier || testCase.name,
          suiteName,
          file: testCase.fileName,
          line: testCase.lineNumber,
          message: testCase.failureMessage,
          stack: testCase.failureSummaries?._values?.[0]?.message,
          attachments,
          duration: testCase.duration || undefined,
          platform: undefined // Will be set later from action context
        };

        // Enhance with categorization and suggestions
        const { category, severity } = categorizeFailure(baseFailure);
        baseFailure.category = category;
        baseFailure.severity = severity;
        baseFailure.suggestions = generateFailureSuggestions(baseFailure);

        failures.push(baseFailure);
      }
    }
  }
  try {
    // Use a local execAsync for xcresulttool (not for xcodebuild test)
    const execAsync = util.promisify(exec);
    // Use getXcresultObject to get the root xcresult object
    const result = await getXcresultObject(xcresultPath, undefined, execAsync);
    const actions = result.actions._values || [];
    for (const action of actions) {
      // Top-level test failures (rare, but keep for completeness)
      const testFailureSummaries = action.actionResult.issues?.testFailureSummaries?._values || [];
      for (const issue of testFailureSummaries) {
        let file = undefined, line = undefined;
        if (issue.documentLocationInCreatingWorkspace?.url) {
          const url = issue.documentLocationInCreatingWorkspace.url._value;
          const match = url.match(/file:\/\/(.*)#EndingLineNumber=(\d+)/);
          if (match) {
            file = match[1];
            line = parseInt(match[2], 10);
          }
        }
        const baseFailure: TestFailure = {
          testIdentifier: issue.testCaseName?._value || "UnknownTest",
          suiteName: "",
          file,
          line,
          message: issue.message?._value || "",
          stack: undefined,
          attachments: []
        };

        // Enhance with categorization and suggestions
        const { category, severity } = categorizeFailure(baseFailure);
        baseFailure.category = category;
        baseFailure.severity = severity;
        baseFailure.suggestions = generateFailureSuggestions(baseFailure);

        failures.push(baseFailure);
      }
      // Recursively collect all failures from test summaries
      const testRefs = action.actionResult.testsRef;
      if (!testRefs || typeof testRefs.id !== "string") continue;
      const testRoot = await getXcresultObject(xcresultPath, testRefs.id);
      const summaries = testRoot.summaries._values || [];
      for (const summary of summaries) {
        const suites = summary.tests._values || [];
        for (const suite of suites) {
          collectFailuresFromSubtests(suite.subtests?._values || [], suite.name);
        }
      }
    }
  } catch (err: any) {
    console.error("[MCP] Error parsing xcresult:", err.stderr || err.message);
  }
  return failures;
}

export async function getXcresultObject(
  xcresultPath: string,
  id?: string,
  execAsyncImpl?: (cmd: string) => Promise<ExecAsyncResult>
): Promise<any> {
  // Use a local execAsync if not provided
  const execAsync = execAsyncImpl || util.promisify(exec);
  // Only include --id if id is provided and not undefined/null/empty
  const idArg = id ? `--id ${id}` : "";
  const cmd = `xcrun xcresulttool get object --legacy --format json --path ${xcresultPath} ${idArg}`.replace(/\s+/g, " ").trim();
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

export interface TestRunResult {
  buildErrors: string[];
  testFailures: TestFailure[];
  // Enhanced fields for AI agent support
  summary?: {
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    skippedTests?: number;
    duration?: number; // total duration in seconds
    platform?: string;
    xcodeVersion?: string;
  };
  artifacts?: {
    xcresultPath?: string;
    logFiles?: string[];
    screenshots?: string[];
    coverageFiles?: string[];
  };
  suggestions?: string[];
  nextSteps?: string[];
}

export async function runTestsAndParseFailures(
  options: TestFixOptions,
  spawnAndCollectOutputImpl: (cmd: string) => Promise<SpawnOutputResult> = spawnAndCollectOutput
): Promise<TestRunResult> {
  // Clean previous test artifacts
  // Generate a unique folder for this run
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runDir = `./.mcp-artifacts/${runId}`;
  await fs.ensureDir(runDir);
  const xcresultPath = `${runDir}/test.xcresult`;
  const outFile = `${runDir}/xcodebuild.stdout.log`;
  const errFile = `${runDir}/xcodebuild.stderr.log`;
  // Clean previous artifacts in this folder (should be empty, but for safety)
  await fs.emptyDir(runDir);
  // Build xcodebuild command
  const workspaceArg = options.xcworkspace ? `-workspace \"${options.xcworkspace}\"` : "";
  const projectArg = options.xcodeproj ? `-project \"${options.xcodeproj}\"` : "";
  const schemeArg = options.scheme ? `-scheme \"${options.scheme}\"` : "";
  const destinationArg = `-destination \"${options.destination || "generic/platform=iOS Simulator"}\"`;
  const resultBundleArg = `-resultBundlePath ${xcresultPath}`;
  const cmd = `xcodebuild test ${workspaceArg} ${projectArg} ${schemeArg} ${destinationArg} ${resultBundleArg}`.replace(/\s+/g, " ").trim();

  console.log(`[MCP] Running tests with: ${cmd}`);

  let buildErrors: string[] = [];
  let testFailures: TestFailure[] = [];
  let testCommandResult: { stdout: string, stderr: string } = { stdout: "", stderr: "" };
  let cleanupDone = false;
  try {
    testCommandResult = await spawnAndCollectOutputImpl(cmd);
    // Detect build failure marker in output
    const output = `${testCommandResult.stdout}\n${testCommandResult.stderr}`;
    if (/The following build commands failed:/i.test(output)) {
      buildErrors = [output];
      await cleanupRunDir(runDir);
      cleanupDone = true;
      const result: TestRunResult = {
        buildErrors,
        testFailures: [],
        summary: {
          failedTests: 0,
          platform: options.destination
        },
        artifacts: {
          xcresultPath: undefined
        },
        suggestions: ["Fix build errors to enable test execution"],
        nextSteps: ["Resolve compilation issues", "Run tests again after build succeeds"]
      };
      return result;
    }
  } catch (err: any) {
    testCommandResult = { stdout: "", stderr: err?.message || "" };
    buildErrors = [testCommandResult.stdout, testCommandResult.stderr];
    await cleanupRunDir(runDir);
    cleanupDone = true;
    const result: TestRunResult = {
      buildErrors,
      testFailures: [],
      summary: {
        failedTests: 0,
        platform: options.destination
      },
      artifacts: {
        xcresultPath: undefined
      },
      suggestions: ["Fix execution errors to enable test running"],
      nextSteps: ["Check project configuration and try again"]
    };
    return result;
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (await fs.pathExists(xcresultPath)) {
    testFailures = await parseXcresultForFailures(xcresultPath);
    
    // Enhance test failures with source code context
    const projectRoot = extractProjectRoot(options);
    if (projectRoot && testFailures.length > 0) {
      console.log(`[MCP] Enhancing ${testFailures.length} test failures with source context from project root: ${projectRoot}`);
      try {
        testFailures = await enhanceTestFailuresWithSourceContext(testFailures, projectRoot);
      } catch (error) {
        console.warn(`[MCP] Failed to enhance test failures with source context:`, error);
      }
    }
  }

  // Create enhanced result with structured data
  const result: TestRunResult = {
    buildErrors,
    testFailures,
    summary: {
      totalTests: undefined, // Could be parsed from output
      passedTests: undefined, // Could be calculated
      failedTests: testFailures.length,
      skippedTests: undefined, // Could be parsed from output
      duration: undefined, // Could be parsed from output
      platform: options.destination,
      xcodeVersion: undefined // Could be detected
    },
    artifacts: {
      xcresultPath: await fs.pathExists(xcresultPath) ? xcresultPath : undefined,
      logFiles: [], // Could include stdout/stderr logs
      screenshots: testFailures.flatMap(f => f.attachments || []),
      coverageFiles: [] // Could be added if coverage is enabled
    },
    suggestions: [], // Will be populated below
    nextSteps: [] // Will be populated below
  };

  // Generate overall suggestions and next steps
  result.suggestions = generateTestRunSuggestions(result);
  result.nextSteps = generateNextSteps(result);

  if (!cleanupDone) {
    await cleanupRunDir(runDir);
  }
  
  return result;
}
