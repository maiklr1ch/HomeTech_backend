import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function requestId(req: Request & { id?: string }, res: Response, next: NextFunction) {
  const header = req.headers['x-request-id'];
  req.id = typeof header === 'string' && header.length <= 100 ? header : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (safeMethods.has(req.method) || !config.corsOrigins.length) return next();
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin.replace(/\/$/, ''))) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Запит з недозволеного джерела' } });
    return;
  }
  next();
}
