import { TestFixOptions } from "./taskOptions.js";
import { exec } from "child_process";
import util from "util";
import fs from "fs-extra";
import { spawnAndCollectOutput } from "../utils/spawnAndCollectOutput.js";

export type TestFailure = {
  testIdentifier: string;
  suiteName: string;
  file?: string;
  line?: number;
  message?: string;
  stack?: string;
  attachments?: string[]; // paths to screenshots
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
    // Use a local execAsync for xcresulttool (not for xcodebuild test)
    const execAsync = util.promisify(exec);
    // Use getXcresultObject to get the root xcresult object
    const result = await getXcresultObject(xcresultPath, undefined as any as string, execAsync);
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
  id?: string,
  execAsyncImpl?: (cmd: string) => Promise<{ stdout: string }>
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
  spawnAndCollectOutputImpl: (cmd: string, files?: { outFile: string, errFile: string }) => Promise<{ stdout: string, stderr: string }> = spawnAndCollectOutput
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
  const cmd = `xcodebuild test ${workspaceArg} ${projectArg} ${schemeArg} ${destinationArg} ${resultBundleArg}`.replace(/\s+/g, ' ').trim();

  console.log(`[MCP] Running tests with: ${cmd}`);

  let buildErrors: string[] = [];
  let testFailures: TestFailure[] = [];
  let testCommandResult: { stdout: string, stderr: string } = { stdout: '', stderr: '' };
  try {
    // Support both 1-arg and 2-arg signatures for spawnAndCollectOutputImpl
    if (spawnAndCollectOutputImpl.length === 1) {
      testCommandResult = await spawnAndCollectOutputImpl(cmd);
    } else {
      testCommandResult = await spawnAndCollectOutputImpl(cmd, { outFile, errFile });
    }
    // Detect build failure marker in output
    const output = `${testCommandResult.stdout}\n${testCommandResult.stderr}`;
    if (/The following build commands failed:/i.test(output)) {
      buildErrors = [output];
      return { buildErrors, testFailures: [] };
    }
  } catch (err: any) {
    testCommandResult = { stdout: '', stderr: err?.message || '' };
    buildErrors = [testCommandResult.stdout, testCommandResult.stderr];
    return { buildErrors, testFailures: [] };
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (await fs.pathExists(xcresultPath)) {
    testFailures = await parseXcresultForFailures(xcresultPath);
  }
  // Clean up the runDir after usage
  try { await fs.remove(runDir); } catch {}
  return { buildErrors, testFailures };
}
