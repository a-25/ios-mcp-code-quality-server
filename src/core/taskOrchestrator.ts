// Explicit result type for orchestrateTask and helpers
import type { TestFailure, TestRunResult } from "./testRunner.js";
export type TaskResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; buildErrors?: string[]; testFailures?: TestFailure[]; aiSuggestions?: string[]; needsContext?: boolean; message?: string };
import PQueue from "p-queue";
import { runTestsAndParseFailures } from "./testRunner.js";
import { runSwiftLintFix } from "./swiftLint.js";
import { exec } from "child_process";
import util from "util";
import { TestFixOptions } from "./taskOptions.js";

const execAsync = util.promisify(exec);
const queue = new PQueue({ concurrency: 2 });

export async function handleTestFixLoop(options: TestFixOptions, maxRetries = 3): Promise<TaskResult<string>> {
  console.log(`[MCP] TestFix options:`, options);
  let lastFailures: TestFailure[] = [];
  let lastBuildErrors: string[] = [];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[MCP] 🧪 Attempt ${attempt} of ${maxRetries}`);
    try {
      const result: TestRunResult = await runTestsAndParseFailures(options);
      lastBuildErrors = result.buildErrors || [];
      lastFailures = result.testFailures || [];
      if (result.buildErrors && result.buildErrors.length > 0) {
        // Instead of calling AI, request more context from the external system
        return {
          success: false,
          error: 'build-error',
          buildErrors: result.buildErrors,
          aiSuggestions: [],
          needsContext: true,
          message: 'Build failed. Please provide the code for the failing test and the class/function under test for better AI suggestions.'
        } as any;
      }
      if (!result.testFailures || result.testFailures.length === 0) {
        console.log("[MCP] ✅ All tests passed.");
        try {
          await autoCommitFixes("Fix: auto-applied test failure resolutions");
        } catch {}
        return { success: true, data: "All tests passed and fixes committed." };
      }
      lastFailures = result.testFailures;
      console.log(`[MCP] ❌ ${result.testFailures.length} test(s) failed.`);
      // Instead of calling AI, request more context from the external system
      return {
        success: false,
        error: 'test-failure',
        testFailures: result.testFailures,
        aiSuggestions: [],
        needsContext: true,
        message: 'Test failed. Please provide the code for the failing test and the class/function under test for better AI suggestions.'
      } as any;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/no such file|not found|does not exist|missing/i.test(msg)) {
        return { success: false, error: 'missing-project' };
      }
      if (/build error|build failed|xcodebuild/i.test(msg)) {
        lastBuildErrors.push(msg);
        return { success: false, error: 'build-error', buildErrors: lastBuildErrors };
      }
      lastBuildErrors.push(msg);
      return { success: false, error: msg, buildErrors: lastBuildErrors };
    }
  }
  console.log("[MCP] ❌ Tests are still failing after max retries.");
  return { success: false, error: 'max-retries', testFailures: lastFailures };
}

async function autoCommitFixes(message: string) {
  try {
    await execAsync("git add .");
    await execAsync(`git commit -m "${message}"`);
    console.log("[MCP] ✅ Auto-committed changes.");
  } catch (err) {
    console.warn("[MCP] Could not commit changes:", err);
  }
}

export async function handleLintFix(path: string): Promise<TaskResult<string>> {
  console.log(`[MCP] Running SwiftLint fix on: ${path}`);
  try {
    const output = await runSwiftLintFix(path);
    console.log("[SwiftLint Output]:\n" + output);
    try {
      await autoCommitFixes("Fix: auto-applied SwiftLint corrections");
    } catch {}
    return { success: true, data: output };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/no such file|not found|does not exist|missing/i.test(msg)) {
      return { success: false, error: 'missing-project' };
    }
    if (/build error|build failed|xcodebuild/i.test(msg)) {
      return { success: false, error: 'build-error' };
    }
    return { success: false, error: msg };
  }
}

export enum TaskType {
  TestFix = "test-fix",
  LintFix = "lint-fix"
}

export interface MCPTaskOptions {
  xcodeproj?: string;
  xcworkspace?: string;
  scheme?: string;
}

export async function orchestrateTask(type: TaskType, options: any = {}): Promise<TaskResult<any>> {
  console.log(`🧠 [MCP] Starting task: ${type}`);
  console.log(`[MCP] Options:`, options);
  let result: TaskResult<any> = { success: false, error: 'Unknown task type' };
  async function runTestFix(): Promise<TaskResult<string>> {
    try {
      return await handleTestFixLoop(options as TestFixOptions);
    } catch (err: any) {
      return { success: false, error: String(err?.message || err || 'unknown-error') };
    }
  }
  async function runLintFix(): Promise<TaskResult<string>> {
    try {
      return await handleLintFix("./Sources");
    } catch (err: any) {
      return { success: false, error: String(err?.message || err || 'unknown-error') };
    }
  }
  switch (type) {
    case TaskType.TestFix: {
      const r = await queue.add(runTestFix);
      result = r === undefined ? { success: false, error: 'unknown-error' } : r;
      break;
    }
    case TaskType.LintFix: {
      const r = await queue.add(runLintFix);
      result = r === undefined ? { success: false, error: 'unknown-error' } : r;
      break;
    }
    default:
      console.warn("[MCP] Unknown task type: ", type);
      result = { success: false, error: 'Unknown task type' };
  }
  await queue.onIdle();
  console.log("[MCP] ✅ Task completed:", type);
  return result;
}
