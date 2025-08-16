import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  MCP_SERVER_NAME: z.string().default("ios-mcp-code-quality-server"),
  MCP_SERVER_VERSION: z.string().default("0.1.0"),
  ALLOWED_HOSTS: z.string().optional().transform(hosts =>
    hosts ? hosts.split(",").map(h => h.trim()) : ["127.0.0.1", "localhost", "127.0.0.1:3000", "localhost:3000"]
  ),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default("60000"), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default("100"),
  SESSION_CLEANUP_INTERVAL_MS: z.string().transform(Number).default("300000"), // 5 minutes
  MAX_CONCURRENT_TASKS: z.string().transform(Number).default("5")
});

export type Environment = z.infer<typeof envSchema>;

export const env: Environment = envSchema.parse(process.env);

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
