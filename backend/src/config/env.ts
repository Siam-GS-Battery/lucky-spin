import path from 'node:path';
import { z } from 'zod';

const SCRIPT_URL_PREFIX = 'https://script.google.com/';
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/** Treats empty strings (e.g. `KEY=` in .env) as "not set". */
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    SCRIPT_GOOGLE_SHEET: optionalString.refine(
      (value) => value === undefined || value.startsWith(SCRIPT_URL_PREFIX),
      { message: `must start with ${SCRIPT_URL_PREFIX}` },
    ),
    SCRIPT_TOKEN: optionalString,
    APP_USERNAME: optionalString,
    APP_PASSWORD: optionalString,
    JWT_SECRET: optionalString,
    ADMIN_PIN: optionalString.refine((value) => value === undefined || /^\d{4,8}$/.test(value), {
      message: 'must be 4 to 8 digits',
    }),
    FRONTEND_DIST: z.string().min(1).default(path.resolve(process.cwd(), '../frontend/dist')),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return;
    const requiredInProduction = [
      'SCRIPT_GOOGLE_SHEET',
      'SCRIPT_TOKEN',
      'APP_USERNAME',
      'APP_PASSWORD',
      'JWT_SECRET',
      'ADMIN_PIN',
    ] as const;
    for (const key of requiredInProduction) {
      if (env[key] === undefined) {
        context.addIssue({ code: 'custom', path: [key], message: 'is required in production' });
      }
    }
    if (env.JWT_SECRET !== undefined && env.JWT_SECRET.length < MIN_PRODUCTION_SECRET_LENGTH) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: `must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment: ${issues.join('; ')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Parses and validates environment variables. Error messages name the variable
 * and the rule only, never the value, so secrets do not leak into logs.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
    throw new EnvValidationError(issues);
  }
  return result.data;
}
