import { sanitize } from '../../src/utils/sanitization.js';

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
const authRateLimitMap = new Map<string, { count: number; lastReset: number }>();

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

const AUTH_WINDOW_SIZE_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 5; // 5 attempts per 15 mins per IP

export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
    // Bypass rate limiting in local development to prevent blocking tests and hot-reloads
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Parse route from request URL
    const url = req.url || '';
    const cleanPath = url.split('?')[0];
    const isAuthRoute = cleanPath === '/api/user' || cleanPath.endsWith('/api/user');

    // 1. Strict Auth Limit for Login/Auth endpoints
    if (isAuthRoute) {
        const authLimit = authRateLimitMap.get(ip) || { count: 0, lastReset: now };
        if (now - authLimit.lastReset > AUTH_WINDOW_SIZE_MS) {
            authLimit.count = 1;
            authLimit.lastReset = now;
        } else {
            authLimit.count++;
        }
        authRateLimitMap.set(ip, authLimit);

        if (authLimit.count > AUTH_MAX_REQUESTS) {
            res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
            return false;
        }
    }

    // 2. Standard Global Limit
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
 * Deep recursive input sanitization to escape unsafe content while preserving URLs
 */
export function sanitizeInput<T>(obj: T): T {
    if (typeof obj === 'string') {
        if (
            obj.startsWith('http://') || 
            obj.startsWith('https://') || 
            obj.startsWith('data:image') || 
            obj.startsWith('/')
        ) {
            return obj;
        }
        return sanitize(obj) as any;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item)) as any;
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
            newObj[key] = sanitizeInput((obj as any)[key]);
        }
        return newObj;
    }
    return obj;
}

export interface ValidateOptions {
    maxBytes?: number;
    sanitizeBody?: boolean;
}

/**
 * Validates request payload size and JSON malformation, and sanitizes body
 */
export function validatePayload(
    req: VercelRequest,
    res: VercelResponse,
    options: ValidateOptions = {}
): boolean {
    const { maxBytes = 2 * 1024 * 1024, sanitizeBody = true } = options;

    // 1. Content Length Checks (oversized payload prevention)
    const contentLength = req.headers['content-length'];
    if (contentLength) {
        const bytes = parseInt(contentLength, 10);
        if (isNaN(bytes) || bytes > maxBytes) {
            res.status(413).json({ error: 'Payload Too Large' });
            return false;
        }
    }

    // 2. Malformed JSON Check
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
        if (contentLength && parseInt(contentLength, 10) > 0 && (req.body === undefined || req.body === null)) {
            res.status(400).json({ error: 'Malformed request: Invalid JSON body' });
            return false;
        }
        if (typeof req.body === 'string' && req.body.trim().length > 0) {
            try {
                req.body = JSON.parse(req.body);
            } catch (e) {
                res.status(400).json({ error: 'Malformed request: Invalid JSON syntax' });
                return false;
            }
        }
    }

    // 3. Input Sanitization
    if (sanitizeBody && req.body) {
        try {
            req.body = sanitizeInput(req.body);
        } catch (e) {
            res.status(400).json({ error: 'Malformed request payload structure' });
            return false;
        }
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
