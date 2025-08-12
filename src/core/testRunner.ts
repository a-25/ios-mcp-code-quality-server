import { TestFixOptions } from "./taskOptions.js";
import { exec, spawn } from "child_process";
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
  id: string,
  execAsyncImpl?: (cmd: string) => Promise<{ stdout: string }>
): Promise<any> {
  // Use a local execAsync if not provided
  const execAsync = execAsyncImpl || util.promisify(exec);
  const { stdout } = await execAsync(`xcrun xcresulttool get object --legacy --format json --path ${xcresultPath} --id ${id}`);
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
  let exitCode: number | null = null;
  const outFile = './xcodebuild.stdout.log';
  const errFile = './xcodebuild.stderr.log';
  let outStream: fs.WriteStream | undefined;
  let errStream: fs.WriteStream | undefined;
  try {
    // Stream output to files to avoid memory limits
    outStream = fs.createWriteStream(outFile);
    errStream = fs.createWriteStream(errFile);
    const child = spawn(cmd, { shell: true });
    child.stdout.pipe(outStream);
    child.stderr.pipe(errStream);
    exitCode = await new Promise((resolve, reject) => {
      child.on('close', resolve);
      child.on('error', reject);
    });
    // Always end streams after process closes
    if (outStream) outStream.end();
    if (errStream) errStream.end();
    // Wait for streams to finish writing, but with a timeout to avoid hanging forever
    await Promise.all([
      new Promise<void>(res => {
        if (outStream) outStream.on('finish', () => res()); else res();
        setTimeout(res, 5000); // 5s safety timeout
      }),
      new Promise<void>(res => {
        if (errStream) errStream.on('finish', () => res()); else res();
        setTimeout(res, 5000);
      })
    ]);
    testCommandResult = {
      stdout: await fs.readFile(outFile, 'utf8'),
      stderr: await fs.readFile(errFile, 'utf8'),
    };
  } catch (err: any) {
    testCommandResult = { stdout: '', stderr: err?.message || '' };
    return { buildErrors: [testCommandResult.stdout, testCommandResult.stderr] };
  } finally {
    // Ensure streams are closed and files are cleaned up
    if (outStream && !outStream.closed) outStream.end();
    if (errStream && !errStream.closed) errStream.end();
    try { await fs.remove(outFile); } catch {}
    try { await fs.remove(errFile); } catch {}
  }
  const output = `${testCommandResult.stdout}\n${testCommandResult.stderr}`;
  // Look for build failure patterns
  if (/Testing failed:/i.test(output)) {
    return { buildErrors: [testCommandResult.stdout, testCommandResult.stderr] };
  }
  console.log(`[MCP] xcodebuild output: ${testCommandResult.stdout}, error: ${testCommandResult.stderr}`);

  if (await fs.pathExists(xcresultPath)) {
    const failures = await parseXcresultForFailures(xcresultPath);
    return failures;
  }
  // If xcresultPath does not exist, return empty array to avoid hanging
  return [];
}
