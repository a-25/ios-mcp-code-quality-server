import type { TaskResult } from "./taskOrchestrator.js";
import type { TestFixOptions } from "./taskOptions.js";

export interface MCPContent {
  type: "text";
  text: string;
  _meta?: any;
  resource?: any;
  [key: string]: any;
}

export function formatTestResultResponse(
  input: TestFixOptions,
  validation: import("./taskOptions.js").ValidationResult,
  result: TaskResult<string> | undefined
): { content: MCPContent[]; _meta?: any } {
  if (!validation.valid) {
    return {
      content: [
        { type: "text", text: `Error: ${validation.error || "Unknown validation error"}`, _meta: undefined }
      ],
      _meta: undefined
    };
  }
  if (result && !result.success && result.needsContext) {
    let contextText = "";
    if (result.buildErrors && result.buildErrors.length > 0) {
      contextText += `\nBuild errors:\n${result.buildErrors.join("\n")}`;
    }
    if (result.testFailures && result.testFailures.length > 0) {
      contextText += `\nTest failures:\n${result.testFailures
        .map((f: any) => {
          let details = `- ${f.testIdentifier || ""}`;
          if (f.suiteName) details += `\n  Suite: ${f.suiteName}`;
          if (f.file) details += `\n  File: ${f.file}`;
          if (f.line) details += `\n  Line: ${f.line}`;
          if (f.message) details += `\n  Message: ${f.message}`;
          if (f.stack) details += `\n  Stack: ${f.stack}`;
          return details;
        })
        .join("\n")}`;
    }
    return {
      content: [
        {
          type: "text",
          text: `Incomplete context: ${result.message || "Please provide the missing context and retry."}${contextText}`,
          _meta: undefined
        }
      ],
      _meta: undefined
    };
  }
  if (!result || typeof result !== "object" || !("success" in result)) {
    return {
      content: [
        {
          type: "text",
          text: "Tests could not be completed. The server did not return a valid result. This may indicate a build system error or a misconfiguration. Please check your project/workspace path and try again.",
          _meta: undefined
        }
      ],
      _meta: undefined
    };
  }
  if (result.success) {
    return { content: [{ type: "text", text: JSON.stringify(result.data), _meta: undefined }], _meta: undefined };
  } else {
    if (
      "buildErrors" in result &&
      Array.isArray(result.buildErrors) &&
      result.buildErrors.length > 0
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Build errors occurred.\n\n${result.buildErrors.map((e: string) => `- ${e}`).join("\n")}\n\nFull error JSON:\n${JSON.stringify(result, null, 2)}`,
            _meta: undefined
          }
        ],
        _meta: undefined
      };
    }
    if (
      "testFailures" in result &&
      Array.isArray(result.testFailures) &&
      result.testFailures.length > 0
    ) {
      return {
        content: [
          {
            type: "text",
            text: `Test failures:\n\n${result.testFailures.map((f: any) => `- ${f.testIdentifier}: ${f.message || ""}`).join("\n")}\n\nFull error JSON:\n${JSON.stringify(result, null, 2)}`,
            _meta: undefined
          }
        ],
        _meta: undefined
      };
    }
    if (result.error === "max-retries") {
      return {
        content: [
          {
            type: "text",
            text: "Tests were rebuilt the maximum number of times, but are still failing. Please review your test failures and code before retrying.",
            _meta: undefined
          }
        ],
        _meta: undefined
      };
    }
    if (result.error === "build-error") {
      return {
        content: [
          {
            type: "text",
            text: "Tests failed to build. There was a build error, not just a test failure. Please check your build logs for details and ensure your project builds successfully before running tests.",
            _meta: undefined
          }
        ],
        _meta: undefined
      };
    }
    if (result.error === "missing-project") {
      return {
        content: [
          {
            type: "text",
            text: "The .xcworkspace or .xcodeproj file is missing or was not found. Please provide an absolute path to your project or workspace file. Hint: Relative paths may not work—use the full path from the root of your filesystem.",
            _meta: undefined
          }
        ],
        _meta: undefined
      };
    }
    return {
      content: [
        { type: "text", text: `Error: ${result.error}`, _meta: undefined }
      ],
      _meta: undefined
    };
  }
}
