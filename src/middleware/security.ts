import { Request, Response, NextFunction } from "express";
import { env } from "../config/environment.js";
import { logger } from "../utils/logger.js";
import { McpErrorCode } from "../utils/errorHandling.js";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// DNS rebinding protection best practice
// Reference: https://portswigger.net/web-security/cors/restricting-access-to-servers
// Goal: Prevent malicious websites from accessing localhost services via DNS rebinding attacks
// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, env.SESSION_CLEANUP_INTERVAL_MS);

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();

  if (!store[clientId] || store[clientId].resetTime < now) {
    store[clientId] = {
      count: 1,
      resetTime: now + env.RATE_LIMIT_WINDOW_MS
    };
    return next();
  }

  store[clientId].count++;

  if (store[clientId].count > env.RATE_LIMIT_MAX_REQUESTS) {
    logger.security("Rate limit exceeded", { clientId, count: store[clientId].count });
    return res.status(429).json({
      jsonrpc: "2.0",
      error: {
        code: McpErrorCode.RATE_LIMIT_EXCEEDED,
        message: "Too Many Requests: Rate limit exceeded"
      },
      id: null
    });
  }

  next();
};

export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  next();
};

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    logger.request(req.method, req.url, sessionId, duration);
  });

  next();
};
