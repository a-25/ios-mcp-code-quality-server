import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  MCP_SERVER_NAME: z.string().default("ios-mcp-code-quality-server"),
  MCP_SERVER_VERSION: z.string().default("0.1.0"),

  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default("60000"), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default("100"),
  SESSION_CLEANUP_INTERVAL_MS: z.string().transform(Number).default("300000"), // 5 minutes
  MAX_CONCURRENT_TASKS: z.string().transform(Number).default("5"),
  // Health check memory thresholds (as decimal ratios, e.g., 0.9 = 90%)
  MEMORY_WARNING_THRESHOLD: z.string().transform(Number).default("0.7"),
  MEMORY_ERROR_THRESHOLD: z.string().transform(Number).default("0.9")
});

const rawEnv = envSchema.parse(process.env);

export type Environment = z.infer<typeof envSchema>;

export const env: Environment = rawEnv;

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
