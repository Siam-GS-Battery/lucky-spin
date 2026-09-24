import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from './env.js';

const PRODUCTION_ENV = {
  NODE_ENV: 'production',
  SCRIPT_GOOGLE_SHEET: 'https://script.google.com/macros/s/example/exec',
  SCRIPT_TOKEN: 'script-token',
  APP_USERNAME: 'booth',
  APP_PASSWORD: 'booth-password',
  JWT_SECRET: 'x'.repeat(32),
  ADMIN_PIN: '1234',
  FRONTEND_DIST: '/app/frontend/dist',
};

function issuesOf(source: NodeJS.ProcessEnv): string[] {
  try {
    loadEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) return error.issues;
    throw error;
  }
  return [];
}

describe('loadEnv', () => {
  it('applies defaults in development', () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.PORT).toBe(8787);
    expect(env.FRONTEND_DIST).toMatch(/frontend[\\/]dist$/);
  });

  it('coerces PORT and treats empty strings as unset', () => {
    const env = loadEnv({ PORT: '3000', APP_PASSWORD: '', SCRIPT_TOKEN: '' });

    expect(env.PORT).toBe(3000);
    expect(env.APP_PASSWORD).toBeUndefined();
    expect(env.SCRIPT_TOKEN).toBeUndefined();
  });

  it('accepts a complete production environment', () => {
    expect(loadEnv(PRODUCTION_ENV).JWT_SECRET).toHaveLength(32);
  });

  it('rejects a script URL that is not on script.google.com', () => {
    expect(issuesOf({ SCRIPT_GOOGLE_SHEET: 'https://evil.example.com/exec' })).toEqual([
      'SCRIPT_GOOGLE_SHEET must start with https://script.google.com/',
    ]);
  });

  it.each(['123', '123456789', '12a4'])('rejects ADMIN_PIN %s', (pin) => {
    expect(issuesOf({ ADMIN_PIN: pin })).toEqual(['ADMIN_PIN must be 4 to 8 digits']);
  });

  it('rejects an invalid PORT', () => {
    expect(issuesOf({ PORT: '70000' })).toHaveLength(1);
  });

  it('requires every secret in production', () => {
    expect(issuesOf({ NODE_ENV: 'production' })).toEqual([
      'SCRIPT_GOOGLE_SHEET is required in production',
      'SCRIPT_TOKEN is required in production',
      'APP_USERNAME is required in production',
      'APP_PASSWORD is required in production',
      'JWT_SECRET is required in production',
      'ADMIN_PIN is required in production',
    ]);
  });

  it('requires a 32+ character JWT_SECRET in production', () => {
    expect(issuesOf({ ...PRODUCTION_ENV, JWT_SECRET: 'short' })).toEqual([
      'JWT_SECRET must be at least 32 characters in production',
    ]);
  });

  it('never includes secret values in the error message', () => {
    const issues = issuesOf({ ...PRODUCTION_ENV, JWT_SECRET: 'leaky-secret' });

    expect(issues.join(' ')).not.toContain('leaky-secret');
  });
});
