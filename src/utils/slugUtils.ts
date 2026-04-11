/**
 * Generate a random alphanumeric slug
 */
export function generateRandomSlug(length: number = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a URL-friendly slug from a name
 * Example: "David Young" -> "david-young"
 */
export function generateSlug(name: string): string {
    if (!name || name.trim().length === 0) {
        // Fallback to random slug if name is empty
        return generateRandomSlug(8);
    }

    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single
        .replace(/^-|-$/g, '')     // Trim hyphens from start/end
        .substring(0, 50);         // Limit to 50 characters
}

/**
 * Validate slug format
 * Rules: lowercase letters, numbers, hyphens only, 3-50 characters
 */
export function validateSlugFormat(slug: string): boolean {
    if (!slug || slug.length < 3 || slug.length > 50) {
        return false;
    }

    // Only lowercase letters, numbers, and hyphens
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
}

/**
 * Sanitize a slug to ensure it meets format requirements
 */
export function sanitizeSlug(slug: string): string {
    return slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
        .replace(/-+/g, '-')         // Replace multiple hyphens
        .replace(/^-|-$/g, '')       // Trim hyphens
        .substring(0, 50);           // Limit length
}

/**
 * Reserved slugs that cannot be used
 */
const RESERVED_SLUGS = [
    'admin',
    'api',
    'app',
    'auth',
    'card',
    'cards',
    'dashboard',
    'login',
    'logout',
    'signup',
    'settings',
    'profile',
    'user',
    'users',
    'new',
    'edit',
    'delete',
    'create',
];

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.includes(slug.toLowerCase());
}
