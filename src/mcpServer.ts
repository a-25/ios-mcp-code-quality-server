import express from "express";
import { orchestrateTask, TaskType } from "./core/taskOrchestrator.js";
import { validateTestFixOptions, validateLintFixOptions, TestFixOptions, LintFixOptions } from "./core/taskOptions.js";

const app = express();
app.use(express.json());

app.post("/run-task", async (req, res) => {
  const { type, xcodeproj, xcworkspace, scheme, destination } = req.body;
  console.log(`[MCP] Received /run-task with type: ${type}, xcodeproj: ${xcodeproj}, xcworkspace: ${xcworkspace}, scheme: ${scheme}, destination: ${destination}`);
  const validTypes = Object.values(TaskType);
  if (!type || !validTypes.includes(type)) {
    console.log(`[MCP] Invalid or missing task type: ${type}`);
    return res.status(400).json({ error: "Invalid or missing task type" });
  }
  let validation;
  let options;
  if (type === TaskType.TestFix) {
    options = { xcodeproj, xcworkspace, scheme, destination } as TestFixOptions;
    validation = validateTestFixOptions(options);
  } else if (type === TaskType.LintFix) {
    options = { xcodeproj, xcworkspace } as LintFixOptions;
    validation = validateLintFixOptions(options);
  }
  if (validation && !validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  try {
    console.log(`[MCP] Starting orchestrateTask for type: ${type}`);
    await orchestrateTask(type as TaskType, options);
    console.log(`[MCP] Task completed: ${type}`);
    res.json({ status: "Task completed", type });
  } catch (err) {
    const errorMsg = (err && typeof err === "object" && "message" in err) ? (err as Error).message : "Task failed";
    console.log(`[MCP] Task failed: ${errorMsg}`);
    res.status(500).json({ error: errorMsg });
  }
});

app.get("/status", (req, res) => {
  res.json({ status: "MCP server running" });
});

export function startMcpServer(port = 3000) {
  app.listen(port, () => {
    console.log(`[MCP] HTTP server listening on port ${port}`);
  });
}
