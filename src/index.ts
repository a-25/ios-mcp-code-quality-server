import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { orchestrateTask, TaskType } from "./core/taskOrchestrator.js";
import { formatTestResultResponse } from "./core/formatTestResultResponse.js";
import { validateTestFixOptions, validateLintFixOptions, TestFixOptions, LintFixOptions } from "./core/taskOptions.js";
import type { TaskResult } from "./core/taskOrchestrator.js";
import { env } from "./config/environment.js";
import { logger } from "./utils/logger.js";
import { rateLimitMiddleware, securityHeadersMiddleware, requestLoggingMiddleware } from "./middleware/security.js";
import { createMcpErrorResponse, McpError, McpErrorCode, handleAsyncError, withTimeout } from "./utils/errorHandling.js";
import { healthCheckHandler } from "./utils/health.js";

const app = express();
app.use(express.json());
app.use(securityHeadersMiddleware);
app.use(rateLimitMiddleware);
app.use(requestLoggingMiddleware);

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Health check endpoint
app.get("/health", healthCheckHandler);

// Session cleanup
setInterval(() => {
  Object.keys(transports).forEach(sessionId => {
    const transport = transports[sessionId];
    // Clean up old sessions (this is a simple approach, could be more sophisticated)
    if (transport && !transport.sessionId) {
      delete transports[sessionId];
    }
  });
}, env.SESSION_CLEANUP_INTERVAL_MS);

logger.info("MCP Server starting", {
  port: env.PORT,
  environment: env.NODE_ENV,
  version: env.MCP_SERVER_VERSION
});

app.post("/", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  try {
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport;
          logger.info("MCP session initialized", { sessionId });
        },
        enableDnsRebindingProtection: true,
        allowedHosts: env.ALLOWED_HOSTS
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          logger.info("MCP session closed", { sessionId: transport.sessionId });
          delete transports[transport.sessionId];
        }
      };

      const server = new McpServer({
        name: env.MCP_SERVER_NAME,
        version: env.MCP_SERVER_VERSION
      });

      // Note: Resources and prompts will be added in future updates
      // registerResources(server);
      // registerPrompts(server);

      // Register MCP test tool with enhanced error handling
      server.registerTool(
        "test",
        {
          title: "Run iOS tests",
          description: "Run iOS tests and report failures with comprehensive error handling",
          inputSchema: {
            xcodeproj: z.string().optional(),
            xcworkspace: z.string().optional(),
            scheme: z.string().optional(),
            destination: z.string().optional()
          }
        },
        async (input) => {
          return handleAsyncError(async () => {
            const options = input as TestFixOptions;
            const validation = validateTestFixOptions(options);

            logger.taskStart("test", options);
            const startTime = Date.now();

            const result = await withTimeout(
              orchestrateTask(TaskType.TestFix, options) as Promise<TaskResult<string>>,
              300000, // 5 minutes timeout
              "test execution"
            );

            const duration = Date.now() - startTime;
            logger.taskComplete("test", result.success, duration);

            return formatTestResultResponse(options, validation, result);
          }, "Test execution failed");
        }
      );

      // Register MCP lint tool with enhanced error handling
      server.registerTool(
        "lint",
        {
          title: "Run SwiftLint",
          description: "Run SwiftLint and report issues with comprehensive analysis",
          inputSchema: {
            xcodeproj: z.string().optional(),
            xcworkspace: z.string().optional(),
            path: z.string().optional().describe("Path to analyze (defaults to ./Sources)")
          }
        },
        async (input) => {
          return handleAsyncError(async () => {
            const options = input as LintFixOptions;
            const validation = validateLintFixOptions(options);

            if (!validation.valid) {
              throw new McpError(
                McpErrorCode.VALIDATION_ERROR,
                validation.error || "Validation failed",
                { options }
              );
            }

            logger.taskStart("lint", options);
            const startTime = Date.now();

            const result = await withTimeout(
              orchestrateTask(TaskType.LintFix, options),
              120000, // 2 minutes timeout
              "lint execution"
            );

            const duration = Date.now() - startTime;
            logger.taskComplete("lint", result.success, duration);

            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          }, "Lint execution failed");
        }
      );

      await server.connect(transport);
    } else {
      const error = createMcpErrorResponse(
        new McpError(McpErrorCode.INVALID_REQUEST, "Bad Request: No valid session ID provided"),
        req.body.id
      );
      return res.status(400).json(error);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error("Error handling MCP request", { error, sessionId });
    const errorResponse = createMcpErrorResponse(error as Error, req.body?.id);
    res.status(500).json(errorResponse);
  }
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      const error = createMcpErrorResponse(
        new McpError(McpErrorCode.INVALID_REQUEST, "Invalid or missing session ID"),
        null
      );
      return res.status(400).json(error);
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    logger.error("Error handling session request", { error });
    const errorResponse = createMcpErrorResponse(error as Error, null);
    res.status(500).json(errorResponse);
  }
};

app.get("/", handleSessionRequest);
app.delete("/", handleSessionRequest);

const server = app.listen(env.PORT, () => {
  logger.info("MCP Server started successfully", {
    port: env.PORT,
    environment: env.NODE_ENV,
    version: env.MCP_SERVER_VERSION,
    allowedHosts: env.ALLOWED_HOSTS
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

