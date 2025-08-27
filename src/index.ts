import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { orchestrateTask, TaskType } from "./core/taskOrchestrator.js";
import { formatTestResultResponse } from "./core/formatTestResultResponse.js";
import { validateTestFixOptions, validateLintFixOptions, validateLintOptions, TestFixOptions, LintFixOptions, LintOptions } from "./core/taskOptions.js";
import { discoverAvailableTests, validateTestNames, formatTestList } from "./core/testDiscovery.js";
import type { TaskResult } from "./core/taskOrchestrator.js";
import { env } from "./config/environment.js";
import { logger } from "./utils/logger.js";
import { rateLimitMiddleware, securityHeadersMiddleware, requestLoggingMiddleware, hostValidationMiddleware } from "./middleware/security.js";
import { createMcpErrorResponse, McpError, McpErrorCode, handleAsyncError } from "./utils/errorHandling.js";
import { healthCheckHandler } from "./utils/health.js";

const app = express();
app.use(express.json());
app.use(securityHeadersMiddleware);
app.use(hostValidationMiddleware);
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
        }
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
          description: "Run iOS tests and report failures with comprehensive error handling. Supports running specific tests and optional target parameter.",
          inputSchema: {
            xcodeproj: z.string().optional(),
            xcworkspace: z.string().optional(),
            scheme: z.string().optional(),
            destination: z.string().optional(),
            tests: z.array(z.string()).optional().describe("Optional array of specific test names to run (e.g., ['MyTestClass/testMethod', 'AnotherTest'])"),
            target: z.string().optional().describe("Optional target parameter for test execution context")
          }
        },
        async (input) => {
          return handleAsyncError(async () => {
            const options = input as TestFixOptions;
            const validation = validateTestFixOptions(options);

            // If validation fails, return early
            if (!validation.valid) {
              throw new McpError(
                McpErrorCode.VALIDATION_ERROR,
                validation.error || "Validation failed",
                { options }
              );
            }

            // Validate test names if provided
            if (options.tests && options.tests.length > 0) {
              console.log(`[MCP] Validating ${options.tests.length} test names...`);
              const testValidation = await validateTestNames(options.tests, options);
              
              if (testValidation.invalid.length > 0) {
                let errorMessage = `Invalid test names: ${testValidation.invalid.join(", ")}`;
                
                // Add suggestions if available
                for (const [invalidTest, suggestions] of Object.entries(testValidation.suggestions)) {
                  if (suggestions.length > 0) {
                    errorMessage += `\n\nDid you mean one of these for '${invalidTest}'?\n${suggestions.join("\n")}`;
                  }
                }
                
                throw new McpError(
                  McpErrorCode.VALIDATION_ERROR,
                  errorMessage,
                  { invalidTests: testValidation.invalid, suggestions: testValidation.suggestions }
                );
              }
              
              console.log(`[MCP] Validated ${testValidation.valid.length} test names successfully`);
            }

            logger.taskStart("test", options);
            const startTime = Date.now();

            const result = await orchestrateTask(TaskType.TestFix, options) as TaskResult<string>;

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
            path: z.string().describe("Path to analyze (required)")
          }
        },
        async (input) => {
          return handleAsyncError(async () => {
            const options = input as LintOptions;
            const validation = validateLintOptions(options);

            if (!validation.valid) {
              throw new McpError(
                McpErrorCode.VALIDATION_ERROR,
                validation.error || "Validation failed",
                { options }
              );
            }

            logger.taskStart("lint", options);
            const startTime = Date.now();

            const result = await orchestrateTask(TaskType.Lint, options);

            const duration = Date.now() - startTime;
            logger.taskComplete("lint", result.success, duration);

            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          }, "Lint execution failed");
        }
      );

      // Register MCP list-tests tool for test discovery
      server.registerTool(
        "list-tests",
        {
          title: "List available iOS tests",
          description: "Discover and list all available tests in the iOS project",
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
            
            // Basic validation - need either xcodeproj or xcworkspace
            if (!options.xcodeproj && !options.xcworkspace) {
              throw new McpError(
                McpErrorCode.VALIDATION_ERROR,
                "Either xcodeproj or xcworkspace must be provided",
                { options }
              );
            }
            
            logger.taskStart("list-tests", options);
            const startTime = Date.now();
            
            const discoveryResult = await discoverAvailableTests(options);
            
            const duration = Date.now() - startTime;
            logger.taskComplete("list-tests", discoveryResult.success, duration);
            
            if (!discoveryResult.success) {
              throw new McpError(
                McpErrorCode.INTERNAL_ERROR,
                `Test discovery failed: ${discoveryResult.error}`,
                { error: discoveryResult.error }
              );
            }
            
            const formattedList = formatTestList(discoveryResult.tests);
            
            return {
              content: [{
                type: "text",
                text: formattedList
              }]
            };
          }, "Test discovery failed");
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
    version: env.MCP_SERVER_VERSION
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

