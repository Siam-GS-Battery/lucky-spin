import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import type { FieldError } from '../types/api.types.js';
import { ValidationError } from '../utils/errors.js';

export interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type RequestPart = keyof RequestSchemas;

const REQUEST_PARTS: readonly RequestPart[] = ['params', 'query', 'body'];

/**
 * Validates request body / query / params with Zod. On success the parsed
 * (coerced, stripped) values replace the originals; on failure it forwards a
 * ValidationError that the global errorHandler renders as 400.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: FieldError[] = [];
    const parsed: Partial<Record<RequestPart, unknown>> = {};

    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];
      if (schema === undefined) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        parsed[part] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        errors.push({
          field: issue.path.length > 0 ? issue.path.map(String).join('.') : part,
          message: issue.message,
        });
      }
    }

    if (errors.length > 0) {
      next(new ValidationError('Validation failed', errors));
      return;
    }

    for (const part of REQUEST_PARTS) {
      if (!(part in parsed)) continue;
      // Express 5 exposes req.query as a getter, so redefine instead of assigning.
      Object.defineProperty(req, part, {
        value: parsed[part],
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    next();
  };
}
