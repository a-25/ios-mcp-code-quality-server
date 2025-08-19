import { logger } from "../utils/logger.js";

export enum McpErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom error codes for our server
  VALIDATION_ERROR = -32000,
  TASK_FAILED = -32001,
  RESOURCE_NOT_FOUND = -32002,
  PERMISSION_DENIED = -32003,
  RATE_LIMIT_EXCEEDED = -32004,
}

export class McpError extends Error {
  public readonly code: McpErrorCode;
  public readonly data?: any;

  constructor(code: McpErrorCode, message: string, data?: any) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }

  toJson() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

export function createMcpErrorResponse(error: Error | McpError, id: any = null) {
  if (error instanceof McpError) {
    logger.error("MCP Error", {
      code: error.code,
      message: error.message,
      data: error.data
    });

    return {
      jsonrpc: "2.0" as const,
      error: error.toJson(),
      id
    };
  }

  // Handle unknown errors
  logger.error("Unexpected error", { message: error.message, stack: error.stack });

  return {
    jsonrpc: "2.0" as const,
    error: {
      code: McpErrorCode.INTERNAL_ERROR,
      message: "Internal server error",
      data: { originalMessage: error.message }
    },
    id
  };
}

export function validateInput(input: any, validator: (input: any) => boolean, fieldName: string) {
  if (!validator(input)) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Invalid parameter: ${fieldName}`,
      { field: fieldName, value: input }
    );
  }
}

export function handleAsyncError<T>(
  operation: () => Promise<T>,
  errorMessage: string = "Operation failed"
): Promise<T> {
  return operation().catch((error) => {
    if (error instanceof McpError) {
      throw error;
    }

    logger.error(`Async operation failed: ${errorMessage}`, { error });
    throw new McpError(McpErrorCode.TASK_FAILED, errorMessage, { originalError: error.message });
  });
}



// Utility functions for common error scenarios
export function taskNotFoundError(taskType: string) {
  return new McpError(
    McpErrorCode.METHOD_NOT_FOUND,
    `Unknown task type: ${taskType}`,
    { taskType }
  );
}

export function validationError(message: string, field?: string, value?: any) {
  return new McpError(
    McpErrorCode.VALIDATION_ERROR,
    message,
    { field, value }
  );
}

export function resourceNotFoundError(resourcePath: string) {
  return new McpError(
    McpErrorCode.RESOURCE_NOT_FOUND,
    `Resource not found: ${resourcePath}`,
    { resourcePath }
  );
}

export function rateLimitError(clientId: string, limit: number) {
  return new McpError(
    McpErrorCode.RATE_LIMIT_EXCEEDED,
    "Rate limit exceeded",
    { clientId, limit }
  );
}
