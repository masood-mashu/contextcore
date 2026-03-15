import { Request, Response, NextFunction } from 'express';

// In production this would come from the DB (api_clients table)
// For MVP we use a single hardcoded dev token
const VALID_TOKENS = new Set([
  'cc-dev-token-2024',          // default dev token
  process.env.CC_API_TOKEN      // optional: set via environment variable
].filter(Boolean) as string[]);

export interface AuthedRequest extends Request {
  clientName?: string;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth for health check — always public
  if (req.path === '/health') {
    next();
    return;
  }

  const token =
    req.headers['x-contextcore-token'] as string ||
    req.query['token'] as string;

  if (!token) {
    res.status(401).json({
      error: 'Missing token',
      hint: 'Add X-ContextCore-Token header to your request'
    });
    return;
  }

  if (!VALID_TOKENS.has(token)) {
    res.status(403).json({
      error: 'Invalid token',
      hint: 'Check your token in the ContextCore dashboard under API tab'
    });
    return;
  }

  req.clientName = 'dev-client';
  next();
}