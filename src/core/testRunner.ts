import { TestFixOptions } from "./taskOptions.js";
import { exec } from "child_process";
import util from "util";
import fs from "fs-extra";
import { spawnAndCollectOutput, SpawnOutputResult } from "../utils/spawnAndCollectOutput.js";

export interface ExecAsyncResult {
  stdout: string;
}

async function cleanupRunDir(runDir: string): Promise<void> {
  try {
    await fs.rm(runDir, { recursive: true, force: true });
  } catch { }
}

// Utility functions for UI test detection and parsing
function detectTestType(testIdentifier: string, message?: string): 'unit' | 'ui' {
  // Check if it's a UI test based on naming conventions
  if (testIdentifier.includes('UITest') || testIdentifier.includes('UI Test')) {
    return 'ui';
  }
  
  // Check for UI test specific error patterns in message
  if (message) {
    const uiTestPatterns = [
      /UI Testing Failure/i,
      /No matches found for find/i,
      /Element.*not found/i,
      /timeout exceeded/i,
      /XCUIElement/i,
      /XCUIApplication/i,
      /Elements matching predicate/i,
      /accessibility identifier/i
    ];
    
    for (const pattern of uiTestPatterns) {
      if (pattern.test(message)) {
        return 'ui';
      }
    }
  }
  
  return 'unit';
}

function parseUITestContext(message: string): UITestContext {
  const context: UITestContext = {};
  
  // Parse element identifier
  const identifierMatch = message.match(/identifier == ['"](.*?)['"]|\(identifier == ['"](.*?)['"]|\['(.*?)'\]/);
  if (identifierMatch) {
    context.elementIdentifier = identifierMatch[1] || identifierMatch[2] || identifierMatch[3];
  }
  
  // Parse element path
  const pathMatch = message.match(/Path ([^"]*)/);
  if (pathMatch) {
    context.elementPath = pathMatch[1];
  }
  
  // Parse timeout duration
  const timeoutMatch = message.match(/(\d+\.?\d*)\s*seconds?/);
  if (timeoutMatch) {
    context.timeoutDuration = parseFloat(timeoutMatch[1]);
    context.isTimeoutError = true;
  }
  
  // Check for element not found
  context.isElementNotFound = /not found|No matches found/i.test(message);
  
  // Check for timeout error
  context.isTimeoutError = context.isTimeoutError || /timeout.*exceeded/i.test(message);
  
  return context;
}

function parseTestAttachments(attachments: any[]): TestAttachment[] {
  if (!attachments) return [];
  
  return attachments.map((att: any) => {
    const filename = att.filename || '';
    let type: 'screenshot' | 'hierarchy' | 'other' = 'other';
    
    if (filename.endsWith('.png') || filename.includes('screenshot')) {
      type = 'screenshot';
    } else if (filename.includes('hierarchy') || filename.endsWith('.txt')) {
      type = 'hierarchy';
    }
    
    return {
      filename,
      type,
      payloadRef: att.payloadRef?.id,
      lifetime: att.lifetime?._value
    };
  });
}
export type TestFailure = {
  testIdentifier: string;
  suiteName: string;
  file?: string;
  line?: number;
  message?: string;
  stack?: string;
  attachments?: TestAttachment[]; // Enhanced attachment info
  testType?: 'unit' | 'ui'; // Auto-detected test type
  uiContext?: UITestContext; // Additional context for UI tests
};

export type TestAttachment = {
  filename: string;
  type: 'screenshot' | 'hierarchy' | 'other';
  payloadRef?: string;
  lifetime?: string;
};

export type UITestContext = {
  elementIdentifier?: string; // The UI element that caused the failure
  elementPath?: string; // XPath-like path to the element
  timeoutDuration?: number; // Timeout value if applicable
  isElementNotFound?: boolean; // Whether this is an element not found error
  isTimeoutError?: boolean; // Whether this is a timeout error
};

async function parseXcresultForFailures(xcresultPath: string): Promise<TestFailure[]> {
  const failures: TestFailure[] = [];
  function collectFailuresFromSubtests(subtests: any[], suiteName: string) {
    for (const testCase of subtests) {
      // If this is a test suite, recurse
      if (testCase.subtests && Array.isArray(testCase.subtests._values) && testCase.subtests._values.length > 0) {
        collectFailuresFromSubtests(testCase.subtests._values, testCase.name || suiteName);
      } else if (testCase.status === "Failure") {
        const testIdentifier = testCase.identifier || testCase.name;
        const message = testCase.failureMessage;
        const testType = detectTestType(testIdentifier, message);
        
        // Parse attachments with enhanced information
        const attachments = parseTestAttachments(testCase.attachments?._values);
        
        // Parse UI context if this is a UI test
        const uiContext = testType === 'ui' ? parseUITestContext(message || '') : undefined;
        
        failures.push({
          testIdentifier,
          suiteName,
          file: testCase.fileName,
          line: testCase.lineNumber,
          message,
          stack: testCase.failureSummaries?._values?.[0]?.message,
          attachments,
          testType,
          uiContext
        });
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
        
        const testIdentifier = issue.testCaseName?._value || "UnknownTest";
        const message = issue.message?._value || "";
        const testType = detectTestType(testIdentifier, message);
        const uiContext = testType === 'ui' ? parseUITestContext(message) : undefined;
        
        failures.push({
          testIdentifier,
          suiteName: "",
          file,
          line,
          message,
          stack: undefined,
          attachments: [],
          testType,
          uiContext
        });
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
  const cmd = `xcrun xcresulttool get object --legacy --format json --path ${xcresultPath} ${idArg}`.replace(/\s+/g, ' ').trim();
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

export interface TestRunResult {
  buildErrors: string[];
  testFailures: TestFailure[];
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
  const destinationArg = `-destination \"${options.destination || 'generic/platform=iOS Simulator'}\"`;
  const resultBundleArg = `-resultBundlePath ${xcresultPath}`;
  
  // Add test target specification if provided
  let testTargetArgs = "";
  if (options.testTarget) {
    testTargetArgs = `-only-testing:${options.testTarget}`;
  } else if (options.testType === 'unit') {
    // Skip UI test targets by default when unit tests are explicitly requested
    // Note: This is a simple heuristic - in practice, you might want to specify exact targets
    console.log("[MCP] Running unit tests only (UI tests will be skipped if they follow UITest naming convention)");
  } else if (options.testType === 'ui') {
    console.log("[MCP] Running all tests including UI tests");
  }
  
  const cmd = `xcodebuild test ${workspaceArg} ${projectArg} ${schemeArg} ${destinationArg} ${resultBundleArg} ${testTargetArgs}`.replace(/\s+/g, ' ').trim();

  console.log(`[MCP] Running tests with: ${cmd}`);

  let buildErrors: string[] = [];
  let testFailures: TestFailure[] = [];
  let testCommandResult: { stdout: string, stderr: string } = { stdout: '', stderr: '' };
  let cleanupDone = false;
  try {
  testCommandResult = await spawnAndCollectOutputImpl(cmd);
    // Detect build failure marker in output
    const output = `${testCommandResult.stdout}\n${testCommandResult.stderr}`;
    if (/The following build commands failed:/i.test(output)) {
      buildErrors = [output];
      await cleanupRunDir(runDir);
      cleanupDone = true;
      return { buildErrors, testFailures: [] };
    }
  } catch (err: any) {
    testCommandResult = { stdout: '', stderr: err?.message || '' };
    buildErrors = [testCommandResult.stdout, testCommandResult.stderr];
    await cleanupRunDir(runDir);
    cleanupDone = true;
    return { buildErrors, testFailures: [] };
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (await fs.pathExists(xcresultPath)) {
    testFailures = await parseXcresultForFailures(xcresultPath);
  }
  if (!cleanupDone) {
    await cleanupRunDir(runDir);
  }
  return { buildErrors, testFailures };
}
