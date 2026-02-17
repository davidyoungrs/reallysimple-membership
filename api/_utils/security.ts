import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Basic CSRF Protection: Checks Origin and Referer headers.
 * For production, this should ideally use specific allowed domains.
 */
export function validateRequest(req: VercelRequest, res: VercelResponse): boolean {
    const origin = req.headers.origin || req.headers.referer;
    const host = req.headers.host;

    // In a serverless environment, we might want to be careful about strict host checks
    // but at least we can verify the origin is not from a known malicious source
    // or is a valid same-origin request if host is present.

    // For Vercel, we can check if it matches the current host
    if (origin && host && !origin.includes(host) && !origin.includes('localhost')) {
        res.status(403).json({ error: 'Forbidden: CSRF check failed' });
        return false;
    }

    return true;
}

/**
 * Simple in-memory rate limiting (per lambda instance).
 * Note: This transitions to Redis (e.g. Upstash) for production-grade reliability.
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const limit = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - limit.lastReset > WINDOW_SIZE_MS) {
        limit.count = 1;
        limit.lastReset = now;
    } else {
        limit.count++;
    }

    rateLimitMap.set(ip, limit);

    if (limit.count > MAX_REQUESTS) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return false;
    }

    return true;
}

/**
 * Combines security checks.
 */
export function secureEndpoint(req: VercelRequest, res: VercelResponse): boolean {
    if (req.method !== 'GET') {
        if (!validateRequest(req, res)) return false;
    }
    return checkRateLimit(req, res);
}
