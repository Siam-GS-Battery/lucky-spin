type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const entries = Object.entries(context).map(([key, value]) => [key, serializeError(value)]);
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...Object.fromEntries(entries),
  });
  const stream = level === 'info' ? process.stdout : process.stderr;
  stream.write(`${line}\n`);
}

/** Structured JSON logger. Never pass passwords, tokens, or PINs in context. */
export const logger = {
  info: (message: string, context?: LogContext): void => {
    write('info', message, context);
  },
  warn: (message: string, context?: LogContext): void => {
    write('warn', message, context);
  },
  error: (message: string, context?: LogContext): void => {
    write('error', message, context);
  },
};
