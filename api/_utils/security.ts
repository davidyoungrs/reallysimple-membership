import { db } from '../../src/db/index.js';
import { apiLogs } from '../../src/db/schema.js';
import { and, eq, gte, count } from 'drizzle-orm';
import { sanitize } from '../../src/utils/sanitization.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory maps for fast rate limiting on public endpoints
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute
const MAX_PUBLIC_REQUESTS = 60; // 60 requests per minute per IP for public endpoints
const MAX_SENSITIVE_REQUESTS = 20; // 20 requests per minute per IP for sensitive endpoints

const BOT_USER_AGENTS = [
    'curl',
    'wget',
    'python',
    'urllib',
    'scrapy',
    'axios',
    'got',
    'node-fetch',
    'postman',
    'headless',
    'selenium',
    'playwright',
    'puppet',
    'scraping',
    'crawler',
    'spider'
];

const ALLOWED_CRAWLERS = [
    'facebookexternalhit',
    'twitterbot',
    'slackbot',
    'discordbot',
    'googlebot',
    'bingbot'
];

/**
 * Checks if a request User-Agent is a known scraping bot or script.
 */
export function isBot(req: VercelRequest): boolean {
    const userAgent = req.headers['user-agent'] || '';
    const ua = userAgent.toLowerCase();
    
    // Whitelist social media preview and search crawlers
    if (ALLOWED_CRAWLERS.some(crawler => ua.includes(crawler))) {
        return false;
    }
    
    return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

/**
 * Logs request details to Neon Postgres database (api_logs table)
 */
export async function logApiRequest(req: VercelRequest, statusCode: number, durationMs: number): Promise<void> {
    try {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
        const url = req.url || '';
        const cleanPath = url.split('?')[0];

        await db.insert(apiLogs).values({
            endpoint: cleanPath,
            method: req.method || 'GET',
            statusCode,
            duration: Math.round(durationMs),
            ipAddress: ip
        });
    } catch (err) {
        console.error('[logApiRequest] Error logging request to DB:', err);
    }
}

/**
 * Checks and enforces rate limits.
 * Uses a hybrid approach:
 *  - In-memory rate limiting for high-traffic public endpoints (to protect Neon connection limit)
 *  - Persistent DB-backed rate limiting for sensitive operations (bulk, creation, update, passes)
 */
export async function checkRateLimit(req: VercelRequest, res: VercelResponse): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const url = req.url || '';
    const cleanPath = url.split('?')[0];

    // Stripe webhook is exempt from rate limits
    if (cleanPath.endsWith('/api/webhooks/stripe')) {
        return true;
    }

    // Determine if endpoint is sensitive (requires db-backed persistent checks)
    const isSensitive = 
        cleanPath.endsWith('/api/passes') || 
        cleanPath.endsWith('/api/admin') ||
        (cleanPath.endsWith('/api/membership') && req.method !== 'GET');

    if (isSensitive) {
        try {
            // Count database logs in the last minute window for this IP & endpoint
            const oneMinuteAgo = new Date(now - WINDOW_SIZE_MS);
            const [result] = await db.select({ count: count() })
                .from(apiLogs)
                .where(and(
                    eq(apiLogs.ipAddress, ip),
                    eq(apiLogs.endpoint, cleanPath),
                    gte(apiLogs.createdAt, oneMinuteAgo)
                ));

            const currentCount = result ? Number(result.count) : 0;
            const remaining = Math.max(0, MAX_SENSITIVE_REQUESTS - currentCount);

            res.setHeader('X-RateLimit-Limit', String(MAX_SENSITIVE_REQUESTS));
            res.setHeader('X-RateLimit-Remaining', String(remaining));
            res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + WINDOW_SIZE_MS) / 1000)));

            if (currentCount >= MAX_SENSITIVE_REQUESTS) {
                res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
                return false;
            }
        } catch (dbErr) {
            console.error('[RateLimit] Database check failed, falling back to in-memory check:', dbErr);
            // Fallback to in-memory check if DB fails
        }
    }

    // Standard in-memory rate limiting (fallback for sensitive, default for public)
    const limit = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    if (now - limit.lastReset > WINDOW_SIZE_MS) {
        limit.count = 1;
        limit.lastReset = now;
    } else {
        limit.count++;
    }
    rateLimitMap.set(ip, limit);

    const maxLimit = isSensitive ? MAX_SENSITIVE_REQUESTS : MAX_PUBLIC_REQUESTS;
    const remaining = Math.max(0, maxLimit - limit.count);

    res.setHeader('X-RateLimit-Limit', String(maxLimit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + WINDOW_SIZE_MS) / 1000)));

    if (limit.count > maxLimit) {
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
 * Monkey-patches response methods to automatically log API requests upon termination.
 */
export function setupResponseLogging(req: VercelRequest, res: VercelResponse): void {
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    let logged = false;
    const logRequest = async (statusCode: number) => {
        if (logged) return;
        logged = true;
        const duration = Date.now() - startTime;
        await logApiRequest(req, statusCode, duration);
    };

    res.json = (body) => {
        logRequest(res.statusCode || 200).catch(err => console.error('[Logging] Error in json wrap:', err));
        return originalJson(body);
    };

    res.send = (body) => {
        logRequest(res.statusCode || 200).catch(err => console.error('[Logging] Error in send wrap:', err));
        return originalSend(body);
    };

    res.end = (chunk: any) => {
        logRequest(res.statusCode || 200).catch(err => console.error('[Logging] Error in end wrap:', err));
        return originalEnd(chunk);
    };
}

