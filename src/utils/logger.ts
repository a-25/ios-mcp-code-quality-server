import { env } from "../config/environment.js";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = this.getLevelFromEnv(env.LOG_LEVEL);
  }

  private getLevelFromEnv(level: string): LogLevel {
    switch (level.toLowerCase()) {
    case "error": return LogLevel.ERROR;
    case "warn": return LogLevel.WARN;
    case "info": return LogLevel.INFO;
    case "debug": return LogLevel.DEBUG;
    default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] [MCP] ${message}`;

    if (meta !== undefined) {
      return `${baseMessage} ${JSON.stringify(meta, null, 2)}`;
    }

    return baseMessage;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage("INFO", message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }

  // Request logging
  request(method: string, url: string, sessionId?: string, duration?: number): void {
    const meta = { method, url, sessionId, duration };
    this.info("HTTP Request", meta);
  }

  // Task logging
  taskStart(taskType: string, options?: any): void {
    this.info(`Task started: ${taskType}`, options);
  }

  taskComplete(taskType: string, success: boolean, duration?: number): void {
    const level = success ? "info" : "warn";
    this[level](`Task completed: ${taskType}`, { success, duration });
  }

  // Security logging
  security(message: string, details?: any): void {
    this.warn(`SECURITY: ${message}`, details);
  }
}

export const logger = new Logger();
