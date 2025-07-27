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

const execAsync = util.promisify(exec);

async function parseXcresultForFailures(xcresultPath: string): Promise<TestFailure[]> {
  const failures: TestFailure[] = [];
  try {
    const { stdout } = await execAsync(`xcrun xcresulttool get --legacy --format json --path ${xcresultPath}`);
    const result = JSON.parse(stdout);
    // Traverse actions and tests
    const actions = result.actions._values || [];
    for (const action of actions) {
      const testRefs = action.actionResult.testsRef;
      if (!testRefs || typeof testRefs.id !== "string") continue;
      const { stdout: testJson } = await execAsync(`xcrun xcresulttool get object --legacy --format json --path ${xcresultPath} --id ${testRefs.id}`);
      const testRoot = JSON.parse(testJson);
      const summaries = testRoot.summaries._values || [];
      for (const summary of summaries) {
        const suites = summary.tests._values || [];
        for (const suite of suites) {
          const suiteName = suite.name;
          const cases = suite.subtests._values || [];
          for (const testCase of cases) {
            if (testCase.status === "Failure") {
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
      }
    }
  } catch (err: any) {
    console.error("[MCP] Error parsing xcresult:", err.stderr || err.message);
  }
  return failures;
}

export async function runTestsAndParseFailures(options: TestFixOptions): Promise<TestFailure[]> {
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
  var testCommandResult: { stdout: string, stderr: string };
  try {
    testCommandResult = await execAsync(cmd);
  } catch (err: any) {
    console.error("[MCP] Error running xcodebuild:", err.stderr || err.message);
    testCommandResult = { stdout: err.stderr, stderr: err.message };
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (await fs.pathExists(xcresultPath)) {
    const failures = await parseXcresultForFailures(xcresultPath);
    return failures;
  } else {
    return [];
  }
}
