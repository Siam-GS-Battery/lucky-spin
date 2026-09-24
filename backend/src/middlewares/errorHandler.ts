import type { NextFunction, Request, Response } from 'express';
import type { ApiFailure } from '../types/api.types.js';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

/** Errors raised by express.json() carry a `type` and an HTTP `status`. */
interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

const BODY_PARSER_MESSAGES = new Map<string, string>([
  ['entity.parse.failed', 'Invalid JSON body'],
  ['entity.too.large', 'Request body too large'],
  ['encoding.unsupported', 'Unsupported content encoding'],
  ['charset.unsupported', 'Unsupported charset'],
]);

/** Catch-all for unmatched routes; must be registered after all routers. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route'));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiFailure>,
  _next: NextFunction,
): void {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  if (isBodyParserError(error)) {
    const message = BODY_PARSER_MESSAGES.get(error.type);
    if (message !== undefined) {
      res.status(error.status).json({ success: false, message });
      return;
    }
  }

  logger.error('Unhandled error', { method: req.method, path: req.path, error });
  res.status(500).json({ success: false, message: INTERNAL_ERROR_MESSAGE });
}
