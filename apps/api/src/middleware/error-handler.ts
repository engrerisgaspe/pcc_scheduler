import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handling middleware
 * Handles: Prisma errors, validation errors, application errors
 * Provides consistent error response format
 * 
 * Usage: app.use(errorHandler);
 */
export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: err.message,
    code: (err as any).code,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Prisma-specific errors
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0];
    return res.status(409).json({
      error: 'Unique constraint violation',
      field,
      message: `A record with this ${field} already exists`,
    });
  }

  if ((err as any).code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      message: 'The requested resource does not exist',
    });
  }

  if ((err as any).code === 'P2003') {
    const field = (err as any).meta?.field_name?.[0];
    return res.status(400).json({
      error: 'Foreign key constraint failed',
      field,
      message: `Invalid reference to related record: ${field}`,
    });
  }

  if ((err as any).code === 'P2014') {
    return res.status(400).json({
      error: 'Required relation violation',
      message: 'Cannot perform this operation due to related records',
    });
  }

  // Express validation errors
  if (err.message?.includes('Validation')) {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
    });
  }

  // Generic application error
  const status = (err as ApiError).status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: err.stack?.split('\n'),
      code: (err as any).code,
    }),
    timestamp: new Date().toISOString(),
  });
};

export default errorHandler;

