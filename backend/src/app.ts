import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const JSON_BODY_LIMIT = '10kb';
const API_PREFIX = '/api';

export interface AppOptions {
  /** Absolute path to the built frontend (Vite `dist`). Skipped if it does not exist. */
  frontendDist: string;
}

function isApiPath(requestPath: string): boolean {
  return requestPath === API_PREFIX || requestPath.startsWith(`${API_PREFIX}/`);
}

function mountFrontend(app: Express, frontendDist: string): void {
  const indexFile = path.join(frontendDist, 'index.html');
  if (!fs.existsSync(indexFile)) return;

  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));

  // SPA fallback: any non-API GET that did not match a static file gets index.html.
  app.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
    if (isApiPath(req.path)) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}

export function createApp(options: AppOptions): Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
        },
      },
    }),
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  // Public: liveness probe for Docker HEALTHCHECK and Railway.
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  // API routers are mounted here under API_PREFIX (task 4).

  mountFrontend(app, options.frontendDist);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
