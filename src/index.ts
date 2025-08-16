import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { orchestrateTask, TaskType } from "./core/taskOrchestrator.js";
import { formatTestResultResponse } from "./core/formatTestResultResponse.js";
import { validateTestFixOptions, validateLintFixOptions, TestFixOptions, LintFixOptions } from "./core/taskOptions.js";
import type { TaskResult } from "./core/taskOrchestrator.js";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[MCP] ${req.method} ${req.url} - Session: ${req.headers['mcp-session-id']}`);
  next();
});

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post('/', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
      enableDnsRebindingProtection: true,
      allowedHosts: ['127.0.0.1', 'localhost', '127.0.0.1:3000', 'localhost:3000'],
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: "ios-mcp-code-quality-server",
      version: "0.0.1"
    });

    // Register MCP test tool
    server.registerTool(
      "test",
      {
        title: "Run iOS tests",
        description: "Run iOS tests and report failures",
        inputSchema: {
          xcodeproj: z.string().optional(),
          xcworkspace: z.string().optional(),
          scheme: z.string().optional(),
          destination: z.string().optional()
        }
      },
      async (input) => {
        const options = input as TestFixOptions;
        const validation = validateTestFixOptions(options);
        try {
          const result = await orchestrateTask(TaskType.TestFix, options) as TaskResult<string>;
          return formatTestResultResponse(options, validation, result);
        } catch (err) {
          const errorMsg = (err && typeof err === "object" && "message" in err) ? (err as Error).message : "Task failed";
          return {
            content: [
              { type: "text", text: `Error: ${errorMsg}` }
            ]
          };
        }
      }
    );

    // Register MCP lint tool
    server.registerTool(
      "lint",
      {
        title: "Run SwiftLint",
        description: "Run SwiftLint and report issues",
        inputSchema: {
          xcodeproj: z.string().optional(),
          xcworkspace: z.string().optional()
        }
      },
      async (input) => {
        const options = input as LintFixOptions;
        const validation = validateLintFixOptions(options);
        if (!validation.valid) {
          return {
            content: [
              { type: "text", text: `Error: ${validation.error || 'Unknown validation error'}` }
            ]
          };
        }
        try {
          const result = await orchestrateTask(TaskType.LintFix, options);
          if (typeof result !== 'object') {
            return {
              content: [
                { type: "text", text: `Error: Unexpected result from orchestrateTask` }
              ]
            };
          }
          if (typeof result === 'object' && 'error' in result && typeof (result as any).error === 'string') {
            return {
              content: [
                { type: "text", text: `Error: ${(result as any).error}` }
              ]
            };
          }
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (err) {
          const errorMsg = (err && typeof err === "object" && "message" in err) ? (err as Error).message : "Task failed";
          return {
            content: [
              { type: "text", text: `Error: ${errorMsg}` }
            ]
          };
        }
      }
    );
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.get('/', handleSessionRequest);
app.delete('/', handleSessionRequest);

app.listen(3000);

