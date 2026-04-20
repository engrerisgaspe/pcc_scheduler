import { Request, Response, NextFunction } from 'express';

/**
 * Request Logging Middleware
 * Logs all incoming requests with method, path, duration, and status
 * Provides structured logging for debugging and monitoring
 */

interface RequestWithTimestamp extends Request {
  startTime?: number;
}

export const requestLogger = (
  req: RequestWithTimestamp,
  res: Response,
  next: NextFunction
) => {
  req.startTime = Date.now();

  // Log request
  if (process.env.LOG_LEVEL !== 'silent') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }

  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - (req.startTime || 0);
    const statusCode = res.statusCode;

    if (process.env.LOG_LEVEL !== 'silent') {
      console.log(
        `[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.path} (${duration}ms)`
      );
    }

    return originalJson(data);
  };

  next();
};

/**
 * Environment-based logging utility
 */
export const logger = {
  info: (message: string, data?: any) => {
    if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'info') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },

  debug: (message: string, data?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
};

export default requestLogger;
