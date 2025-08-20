type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && { error }),
    };

    if (this.isDevelopment) {
      console[level === "debug" ? "log" : level](
        `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        context ? { context } : "",
        error || ""
      );
    } else {
      // In production, you might want to send logs to a service like Winston, Sentry, etc.
      console[level === "debug" ? "log" : level](JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log("error", message, context, error);
  }

  api(method: string, url: string, statusCode: number, duration?: number): void {
    this.info(`${method} ${url} ${statusCode}`, {
      method,
      url,
      statusCode,
      ...(duration && { duration }),
    });
  }

  database(operation: string, table: string, duration?: number): void {
    this.debug(`DB ${operation} on ${table}`, {
      operation,
      table,
      ...(duration && { duration }),
    });
  }
}

export const logger = new Logger();