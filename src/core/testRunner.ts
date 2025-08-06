import { TestFixOptions } from "./taskOptions.js";
import { exec } from "child_process";
import util from "util";
import fs from "fs-extra";

export type TestFailure = {
  testIdentifier: string;
  suiteName: string;
  file?: string;
  line?: number;
  message?: string;
  stack?: string;
  attachments?: string[]; // paths to screenshots
};


export const execAsync = util.promisify(exec);

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
        failures.push({
          testIdentifier: testCase.identifier || testCase.name,
          suiteName,
          file: testCase.fileName,
          line: testCase.lineNumber,
          message: testCase.failureMessage,
          stack: testCase.failureSummaries?._values?.[0]?.message,
          attachments
        });
      }
    }
  }
  try {
    const { stdout } = await execAsync(`xcrun xcresulttool get --legacy --format json --path ${xcresultPath}`);
    const result = JSON.parse(stdout);
    const actions = result.actions._values || [];
    for (const action of actions) {
      // Top-level test failures (rare, but keep for completeness)
      const testFailureSummaries = action.actionResult.issues?.testFailureSummaries?._values || [];
      for (const issue of testFailureSummaries) {
        let file = undefined, line = undefined;
        if (issue.documentLocationInCreatingWorkspace?.url) {
          const url = issue.documentLocationInCreatingWorkspace.url._value;
          const match = url.match(/file:\/\/\/(.*)#EndingLineNumber=(\d+)/);
          if (match) {
            file = match[1];
            line = parseInt(match[2], 10);
          }
        }
        failures.push({
          testIdentifier: issue.testCaseName?._value || "UnknownTest",
          suiteName: "",
          file,
          line,
          message: issue.message?._value || "",
          stack: undefined,
          attachments: []
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
  id: string,
  execAsyncImpl: typeof execAsync = execAsync
): Promise<any> {
  const { stdout } = await execAsyncImpl(`xcrun xcresulttool get object --legacy --format json --path ${xcresultPath} --id ${id}`);
  return JSON.parse(stdout);
}

export async function runTestsAndParseFailures(options: TestFixOptions): Promise<TestFailure[] | { buildErrors: string[] }> {
  // Clean previous test artifacts
  const xcresultPath = "./test.xcresult";
  if (await fs.pathExists(xcresultPath)) {
    await fs.remove(xcresultPath);
    console.log(`[MCP] Removed previous xcresult at ${xcresultPath}`);
  }
  // Build xcodebuild command
  const workspaceArg = options.xcworkspace ? `-workspace \"${options.xcworkspace}\"` : "";
  const projectArg = options.xcodeproj ? `-project \"${options.xcodeproj}\"` : "";
  const schemeArg = options.scheme ? `-scheme \"${options.scheme}\"` : "";
  const destinationArg = `-destination \"${options.destination || 'generic/platform=iOS Simulator'}\"`;
  const resultBundleArg = "-resultBundlePath ./test.xcresult";
  const cmd = `xcodebuild test ${workspaceArg} ${projectArg} ${schemeArg} ${destinationArg} ${resultBundleArg}`.replace(/\s+/g, ' ').trim();

  console.log(`[MCP] Running tests with: ${cmd}`);
  let testCommandResult: { stdout: string, stderr: string } = { stdout: '', stderr: '' };
  let buildFailed = false;
  try {
    testCommandResult = await execAsync(cmd);
  } catch (err: any) {
    // xcodebuild returns nonzero on test or build failure, so we must parse output
    testCommandResult = { stdout: err.stdout || err.stderr || '', stderr: err.stderr || err.message || '' };
    // Look for build failure patterns
    const output = `${testCommandResult.stdout}\n${testCommandResult.stderr}`;
    if (/The following build commands failed:|BUILD FAILED|Testing cancelled because the build failed|\*\* TEST FAILED \*\*/i.test(output)) {
      buildFailed = true;
      // Extract lines about build failure
      const buildErrorLines = output.split('\n').filter(line =>
        /The following build commands failed:|error: |BUILD FAILED|Testing cancelled because the build failed|\*\* TEST FAILED \*\*/i.test(line)
      );
      return { buildErrors: buildErrorLines };
    }
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (buildFailed) {
    // Already returned above, but for safety:
    return { buildErrors: [testCommandResult.stdout, testCommandResult.stderr] };
  }

  if (await fs.pathExists(xcresultPath)) {
    const failures = await parseXcresultForFailures(xcresultPath);
    return failures;
  } else {
    return [];
  }
}
