import { Request, Response } from "express";
import { env } from "../config/environment.js";
import { logger } from "./logger.js";
import * as os from "os";

// Health check best practices based on:
// https://microservices.io/patterns/observability/health-check-api.html
// https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-microservices/monitor-app-health

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: "pass" | "fail" | "warn";
      message?: string;
      duration?: number;
    };
  };
}

class HealthChecker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus["checks"] = {};
    let overallStatus: HealthStatus["status"] = "healthy";

    // Check memory usage
    const memoryCheck = await this.checkMemory();
    checks.memory = memoryCheck;
    if (memoryCheck.status === "fail") overallStatus = "unhealthy";
    if (memoryCheck.status === "warn" && overallStatus === "healthy") overallStatus = "degraded";

    // Check file system access
    const fsCheck = await this.checkFileSystem();
    checks.filesystem = fsCheck;
    if (fsCheck.status === "fail") overallStatus = "unhealthy";
    if (fsCheck.status === "warn" && overallStatus === "healthy") overallStatus = "degraded";

    // Check environment configuration
    const configCheck = this.checkConfiguration();
    checks.configuration = configCheck;
    if (configCheck.status === "fail") overallStatus = "unhealthy";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: env.MCP_SERVER_VERSION,
      checks
    };
  }

  private async checkMemory(): Promise<HealthStatus["checks"]["memory"]> {
    const start = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usage = heapUsedMB / heapTotalMB;

      const duration = Date.now() - start;

      if (usage > env.MEMORY_ERROR_THRESHOLD) {
        return {
          status: "fail",
          message: `High memory usage: ${(usage * 100).toFixed(2)}%`,
          duration
        };
      } else if (usage > env.MEMORY_WARNING_THRESHOLD) {
        return {
          status: "warn",
          message: `Elevated memory usage: ${(usage * 100).toFixed(2)}%`,
          duration
        };
      }

      return {
        status: "pass",
        message: `Memory usage: ${(usage * 100).toFixed(2)}%`,
        duration
      };
    } catch (error) {
      return {
        status: "fail",
        message: `Memory check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - start
      };
    }
  }

  private async checkFileSystem(): Promise<HealthStatus["checks"]["filesystem"]> {
    const start = Date.now();
    try {
      const fs = await import("fs/promises");
      const testFile = `${os.tmpdir()}/mcp-health-check`;

      await fs.writeFile(testFile, "health check");
      await fs.readFile(testFile, "utf-8");
      await fs.unlink(testFile);

      return {
        status: "pass",
        message: "File system access OK",
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        status: "fail",
        message: `File system check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - start
      };
    }
  }

  private checkConfiguration(): HealthStatus["checks"]["configuration"] {
    const start = Date.now();
    try {
      // Since we use environment defaults, just check that env was parsed successfully
      // and basic values are present
      if (!env.MCP_SERVER_NAME || !env.MCP_SERVER_VERSION || !env.PORT) {
        return {
          status: "fail",
          message: "Configuration parsing failed",
          duration: Date.now() - start
        };
      }

      return {
        status: "pass",
        message: "Configuration OK",
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        status: "fail",
        message: `Configuration check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - start
      };
    }
  }
}

const healthChecker = new HealthChecker();

export const healthCheckHandler = async (req: Request, res: Response) => {
  try {
    const health = await healthChecker.checkHealth();
    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

    logger.debug("Health check requested", { status: health.status });
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error("Health check failed", { error });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
};

export { healthChecker };
