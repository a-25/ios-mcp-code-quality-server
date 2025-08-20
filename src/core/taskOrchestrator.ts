// Explicit result type for orchestrateTask and helpers
import type { TestFailure, TestRunResult } from "./testRunner.js";
export type TaskResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; buildErrors?: string[]; testFailures?: TestFailure[]; aiSuggestions?: string[]; needsContext?: boolean; message?: string };
import PQueue from "p-queue";
import { runTestsAndParseFailures } from "./testRunner.js";
import { checkSwiftLintInstallation, runSwiftLintOnChangedFiles, runSwiftLintWithConfig, type SwiftLintResult } from "./swiftLint.js";
import { exec } from "child_process";
import util from "util";
import { TestFixOptions, LintFixOptions, LintOptions } from "./taskOptions.js";

const execAsync = util.promisify(exec);
const queue = new PQueue({ concurrency: 2 });

export async function handleTestFixLoop(options: TestFixOptions): Promise<TaskResult<string>> {
  console.log("[MCP] TestFix options:", options);
  try {
    const result: TestRunResult = await runTestsAndParseFailures(options);
    if (result.buildErrors && result.buildErrors.length > 0) {
      // Instead of calling AI, request more context from the external system
      return {
        success: false,
        error: "build-error",
        buildErrors: result.buildErrors,
        aiSuggestions: [],
        needsContext: true,
        message: "Build failed. Please provide the code for the failing test and the class/function under test for better AI suggestions."
      } as any;
    }
    if (!result.testFailures || result.testFailures.length === 0) {
      console.log("[MCP] ✅ All tests passed.");
      return { success: true, data: "All tests passed." };
    }
    console.log(`[MCP] ❌ ${result.testFailures.length} test(s) failed.`);
    // Instead of calling AI, request more context from the external system
    return {
      success: false,
      error: "test-failure",
      testFailures: result.testFailures,
      aiSuggestions: [],
      needsContext: true,
      message: "Test failed. Please provide the code for the failing test and the class/function under test for better AI suggestions."
    } as any;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/no such file|not found|does not exist|missing/i.test(msg)) {
      return { success: false, error: "missing-project" };
    }
    if (/build error|build failed|xcodebuild/i.test(msg)) {
      return { success: false, error: "build-error", buildErrors: [msg] };
    }
    return { success: false, error: msg, buildErrors: [msg] };
  }
}

export async function handleLintFix(options: LintFixOptions): Promise<TaskResult<SwiftLintResult>> {
  console.log(`[MCP] Running SwiftLint with options:`, options);
  
  // First check if SwiftLint is installed
  const installationCheck = await checkSwiftLintInstallation();
  if (!installationCheck.installed) {
    console.log("[MCP] SwiftLint is not installed");
    return { 
      success: false, 
      error: 'swiftlint-not-installed',
      message: installationCheck.error || "SwiftLint is not installed"
    };
  }
  
  console.log(`[MCP] SwiftLint version: ${installationCheck.version}`);
  
  try {
    let result: SwiftLintResult;
    
    // Lint the provided changed files
    console.log("[MCP] Linting changed files");
    result = await runSwiftLintOnChangedFiles(options.changedFiles, options.configPath);
    
    if (!result.success) {
      return { 
        success: false, 
        error: 'swiftlint-execution-failed',
        message: result.error || "SwiftLint execution failed"
      };
    }
    
    console.log(`[MCP] SwiftLint found ${result.warnings.length} warnings`);
    console.log("[SwiftLint Output]:\n" + result.output);
    
    return { success: true, data: result };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/no such file|not found|does not exist|missing/i.test(msg)) {
      return { success: false, error: "missing-project" };
    }
    if (/build error|build failed|xcodebuild/i.test(msg)) {
      return { success: false, error: "build-error" };
    }
    return { success: false, error: msg };
  }
}

export async function handleLint(options: LintOptions): Promise<TaskResult<SwiftLintResult>> {
  console.log(`[MCP] Running SwiftLint with options:`, options);
  
  // First check if SwiftLint is installed
  const installationCheck = await checkSwiftLintInstallation();
  if (!installationCheck.installed) {
    console.log("[MCP] SwiftLint is not installed");
    return { 
      success: false, 
      error: 'swiftlint-not-installed',
      message: installationCheck.error || "SwiftLint is not installed"
    };
  }
  
  console.log(`[MCP] SwiftLint version: ${installationCheck.version}`);
  
  try {
    let result: SwiftLintResult;
    
    // Lint the provided path
    console.log("[MCP] Linting path:", options.path);
    result = await runSwiftLintWithConfig(options.path);
    
    if (!result.success) {
      return { 
        success: false, 
        error: 'swiftlint-execution-failed',
        message: result.error || "SwiftLint execution failed"
      };
    }
    
    console.log(`[MCP] SwiftLint found ${result.warnings.length} warnings`);
    console.log("[SwiftLint Output]:\n" + result.output);
    
    return { success: true, data: result };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/no such file|not found|does not exist|missing/i.test(msg)) {
      return { success: false, error: "missing-project" };
    }
    if (/build error|build failed|xcodebuild/i.test(msg)) {
      return { success: false, error: "build-error" };
    }
    return { success: false, error: msg };
  }
}

export enum TaskType {
  TestFix = "test-fix",
  LintFix = "lint-fix",
  Lint = "lint"
}


export async function orchestrateTask(type: TaskType, options: any = {}): Promise<TaskResult<any>> {
  console.log(`🧠 [MCP] Starting task: ${type}`);
  console.log("[MCP] Options:", options);
  let result: TaskResult<any> = { success: false, error: "Unknown task type" };
  async function runTestFix(): Promise<TaskResult<string>> {
    try {
      return await handleTestFixLoop(options as TestFixOptions);
    } catch (err: any) {
      return { success: false, error: String(err?.message || err || "unknown-error") };
    }
  }
  async function runLintFix(): Promise<TaskResult<SwiftLintResult>> {
    try {
      return await handleLintFix(options as LintFixOptions);
    } catch (err: any) {
      return { success: false, error: String(err?.message || err || "unknown-error") };
    }
  }
  async function runLint(): Promise<TaskResult<SwiftLintResult>> {
    try {
      return await handleLint(options as LintOptions);
    } catch (err: any) {
      return { success: false, error: String(err?.message || err || "unknown-error") };
    }
  }
  switch (type) {
  case TaskType.TestFix: {
    const r = await queue.add(runTestFix);
    result = r === undefined ? { success: false, error: "unknown-error" } : r;
    break;
  }
  case TaskType.LintFix: {
    const r = await queue.add(runLintFix);
    result = r === undefined ? { success: false, error: "unknown-error" } : r;
    break;
  }
  case TaskType.Lint: {
    const r = await queue.add(runLint);
    result = r === undefined ? { success: false, error: "unknown-error" } : r;
    break;
  }
  default:
    console.warn("[MCP] Unknown task type: ", type);
    result = { success: false, error: "Unknown task type" };
  }
  await queue.onIdle();
  console.log("[MCP] ✅ Task completed:", type);
  return result;
}
