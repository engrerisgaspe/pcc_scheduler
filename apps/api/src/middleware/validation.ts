import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z } from 'zod';

/**
 * Request validation middleware
 * Validates request body against a Zod schema
 * 
 * Usage:
 * router.post('/teachers', validateRequest(createTeacherSchema), handler);
 */

export const validateRequest = (schema: ZodSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }

      res.status(400).json({
        error: 'Validation failed',
        details: String(error),
      });
    }
  };

export default validateRequest;

