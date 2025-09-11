import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimitError } from './errorHandler';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10);

export const createRateLimiter = (windowMs = WINDOW_MS, max = MAX_REQUESTS) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response, next: NextFunction) => {
      const error = new RateLimitError(
        `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`
      );
      next(error);
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    },
  });
};

// Default rate limiter for general API endpoints
export const apiRateLimiter = createRateLimiter();

// Stricter rate limiter for enhancement endpoints
export const enhancementRateLimiter = createRateLimiter(WINDOW_MS, Math.floor(MAX_REQUESTS / 2));

// IP-based rate limiting with custom logic
export const createIPRateLimiter = (windowMs = WINDOW_MS, max = MAX_REQUESTS) => {
  const ipRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let ipData = ipRequests.get(ip);
    
    if (!ipData || now > ipData.resetTime) {
      ipData = { count: 0, resetTime: now + windowMs };
      ipRequests.set(ip, ipData);
    }
    
    if (ipData.count >= max) {
      const error = new RateLimitError(
        `Rate limit exceeded for IP ${ip}. Maximum ${max} requests per ${windowMs / 1000} seconds.`
      );
      next(error);
      return;
    }
    
    ipData.count++;
    next();
  };
};