import PQueue from "p-queue";
import { runTestsAndParseFailures } from "./testRunner.js";
import { getAISuggestion } from "./aiSuggester.js";
import { runSwiftLintFix } from "./swiftLint.js";
import { applySuggestion } from "./suggestionApplier.js";
import { exec } from "child_process";
import util from "util";
import { TestFixOptions } from "./taskOptions.js";

const execAsync = util.promisify(exec);
const queue = new PQueue({ concurrency: 2 });

async function handleTestFixLoop(options: TestFixOptions, maxRetries = 3) {
  console.log(`[MCP] TestFix options:`, options);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[MCP] 🧪 Attempt ${attempt} of ${maxRetries}`);

    const failures = await runTestsAndParseFailures(options);
    if (failures.length === 0) {
      console.log("[MCP] ✅ All tests passed.");

      // Optional: commit changes
      await autoCommitFixes("Fix: auto-applied test failure resolutions");
      return;
    }

    console.log(`[MCP] ❌ ${failures.length} test(s) failed.`);

    for (const failure of failures) {
      const context = `Test Failure:
` +
        `Suite: ${failure.suiteName || "UnknownSuite"}
` +
        `Test: ${failure.testIdentifier}
` +
        `File: ${failure.file}
` +
        `Line: ${failure.line}
` +
        `Message: ${failure.message}
` +
        (failure.stack ? `Stack Trace: ${failure.stack}
` : "") +
        (failure.attachments && failure.attachments.length > 0 ? `Attachments: ${failure.attachments.join(", ")}
` : "");
      const suggestion = await getAISuggestion(
        `The following Swift test failed. Suggest a fix:\n\n${context}`
      );

      console.log("[AI Suggestion]:", suggestion);
      await applySuggestion(suggestion);
    }
  }

  console.log("[MCP] ❌ Tests are still failing after max retries.");
}

async function autoCommitFixes(message: string) {
  try {
    await execAsync("git add .");
    await execAsync(`git commit -m \"${message}\"`);
    console.log("[MCP] ✅ Auto-committed changes.");
  } catch (err) {
    console.warn("[MCP] Could not commit changes:", err);
  }
}

async function handleLintFix(path: string) {
  console.log(`[MCP] Running SwiftLint fix on: ${path}`);
  const output = await runSwiftLintFix(path);
  console.log("[SwiftLint Output]:\n" + output);

  await autoCommitFixes("Fix: auto-applied SwiftLint corrections");
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

export async function orchestrateTask(type: TaskType, options: any = {}) {
  console.log(`🧠 [MCP] Starting task: ${type}`);
  console.log(`[MCP] Options:`, options);

  switch (type) {
    case TaskType.TestFix:
      await queue.add(() => handleTestFixLoop(options as TestFixOptions));
      break;
    case TaskType.LintFix:
      await queue.add(() => handleLintFix("./Sources"));
      break;
    default:
      console.warn("[MCP] Unknown task type: ", type);
  }

  await queue.onIdle();
  console.log("[MCP] ✅ Task completed:", type);
}
