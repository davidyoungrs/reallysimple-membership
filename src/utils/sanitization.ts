/**
 * Simple sanitization utility to prevent XSS attacks.
 * Escapes common HTML characters that could be used for injection.
 */

export function sanitize(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Strips HTML tags entirely for plain text fields.
 */
export function stripHtml(str: string): string {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '');
}

/**
 * Validates if a string contains potential script tags or unsafe patterns.
 */
export function isSafe(str: string): boolean {
    if (!str) return true;
    const unsafePatterns = [
        /<script\b[^>]*>([\s\S]*?)<\/script>/gim,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /javascript:/gi,
        /<iframe\b[^>]*>/gim
    ];

    return !unsafePatterns.some(pattern => pattern.test(str));
}
