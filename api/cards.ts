import { db } from '../src/db/index.js';
import { businessCards, cardViews, cardClicks } from '../src/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import { secureEndpoint } from './_utils/security.js';
import { sanitize } from '../src/utils/sanitization.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// export const config = {
//     runtime: 'edge',
// };

// Reserved slugs
const RESERVED_SLUGS = [
    'admin', 'api', 'app', 'auth', 'card', 'cards', 'dashboard',
    'login', 'logout', 'signup', 'settings', 'profile', 'user',
    'users', 'new', 'edit', 'delete', 'create',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Security Headers (CORS, etc.)
    if (!secureEndpoint(req, res)) return;

    const { method } = req;
    const query = req.query;

    try {
        // --- PUBLIC ENDPOINTS ---

        // A. TRACKING (POST with ?action=track)
        if (method === 'POST' && query.action === 'track') {
            return await handleTrack(req, res);
        }

        // B. CHECK SLUG (GET with ?checkSlug=... OR ?action=check-slug&slug=...)
        if (method === 'GET' && (query.checkSlug || query.action === 'check-slug')) {
            return await handleCheckSlug(req, res);
        }

        // C. GET PUBLIC CARD (GET with ?slug=...)
        // Note: Protected list also uses GET, but without slug (or with specific other params).
        // If we want to List cards, we usually don't send a slug.
        if (method === 'GET' && query.slug && !query.checkSlug) {
            return await handleGetPublicCard(req, res);
        }

        // --- PROTECTED ENDPOINTS (REQUIRE AUTH) ---

        // Verify Token for all subsequent operations
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        const token = authHeader.split(' ')[1];
        let verifiedToken;
        try {
            verifiedToken = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });
        } catch (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
        const authenticatedUserId = verifiedToken.sub;


        // D. LIST CARDS (GET /api/cards)
        if (method === 'GET') {
            return await handleListCards(req, res, authenticatedUserId);
        }

        // E. SAVE CARD (POST /api/cards)
        if (method === 'POST') {
            return await handleSaveCard(req, res, authenticatedUserId);
        }

        // F. DELETE CARD (DELETE /api/cards)
        if (method === 'DELETE') {
            return await handleDeleteCard(req, res, authenticatedUserId);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error?.message });
    }
}

// --- HANDLERS ---

async function handleTrack(req: VercelRequest, res: VercelResponse) {
    try {
        const { slug, source = 'direct', type: actionType, targetInfo, action } = req.body;
        const effectiveAction = action || (req.body.type ? 'click' : 'view');

        if (!slug) return res.status(400).json({ error: 'Missing slug' });

        const cards = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        if (cards.length === 0) return res.status(404).json({ error: 'Card not found' });
        const cardId = cards[0].id;

        const userAgent = req.headers['user-agent'] as string || '';

        if (effectiveAction === 'view') {
            const referrer = (req.headers['referer'] || req.headers['referrer']) as string || null;
            let deviceType = 'desktop';
            if (/mobile/i.test(userAgent)) deviceType = 'mobile';
            else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

            const city = (req.headers['x-vercel-ip-city'] as string) || null;
            const region = (req.headers['x-vercel-ip-country-region'] as string) || null;
            const country = (req.headers['x-vercel-ip-country'] as string) || null;
            const latitude = (req.headers['x-vercel-ip-latitude'] as string) || null;
            const longitude = (req.headers['x-vercel-ip-longitude'] as string) || null;
            const forwardedFor = req.headers['x-forwarded-for'] as string;
            const ipAddress = (req.headers['x-real-ip'] as string) || (forwardedFor ? forwardedFor.split(',')[0] : null);

            await db.insert(cardViews).values({ cardId, referrer, userAgent, city, region, country, latitude, longitude, ipAddress, deviceType, source });
        } else if (effectiveAction === 'click') {
            if (!actionType) return res.status(400).json({ error: 'Missing click type' });
            await db.insert(cardClicks).values({ cardId, type: actionType, targetInfo, userAgent });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Track error:', error);
        return res.status(200).json({ success: false, error: error?.message });
    }
}

async function handleCheckSlug(req: VercelRequest, res: VercelResponse) {
    const slug = (req.query.checkSlug || req.query.slug) as string;
    const currentCardId = req.query.cardId as string;

    if (!slug) return res.status(400).json({ error: 'Missing slug parameter' });
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
        return res.status(200).json({ available: false, reason: 'reserved', suggestion: `${slug}-card` });
    }

    const existingCards = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
    if (existingCards.length > 0 && (!currentCardId || existingCards[0].id.toString() !== currentCardId)) {
        return res.status(200).json({ available: false, reason: 'taken', suggestion: `${slug}-2` });
    }
    return res.status(200).json({ available: true });
}

async function handleGetPublicCard(req: VercelRequest, res: VercelResponse) {
    let slug = req.query.slug as string;
    if (!slug && req.url) {
        const parts = req.url.split('/');
        // Handle path based slug if needed, though with consolidated API, query param is preferred.
    }
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    const cards = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
    if (cards.length === 0) return res.status(404).json({ error: 'Card not found' });
    return res.status(200).json({ success: true, card: cards[0] });
}

async function handleListCards(req: VercelRequest, res: VercelResponse, userId: string) {
    const cards = await db.select({
        id: businessCards.id,
        uid: businessCards.uid,
        userId: businessCards.userId,
        data: businessCards.data,
        slug: businessCards.slug,
        isActive: businessCards.isActive,
        createdAt: businessCards.createdAt,
        updatedAt: businessCards.updatedAt,
        viewCount: sql<number>`cast(count(${cardViews.id}) as integer)`,
    })
        .from(businessCards)
        .leftJoin(cardViews, eq(cardViews.cardId, businessCards.id))
        .where(eq(businessCards.userId, userId))
        .groupBy(businessCards.id)
        .orderBy(desc(businessCards.updatedAt));

    return res.status(200).json({ success: true, cards });
}

async function handleSaveCard(req: VercelRequest, res: VercelResponse, authenticatedUserId: string) {
    const { cardData, cardId, userId: bodyUserId } = req.body;

    // Security check: ensure the userId in body (if present) matches the token
    if (bodyUserId && bodyUserId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Unauthorized user mismatch' });
    }
    const effectiveUserId = authenticatedUserId;

    if (!cardData) return res.status(400).json({ error: 'Missing card data' });

    // Sanitize
    if (cardData.fullName) cardData.fullName = sanitize(cardData.fullName);
    if (cardData.bio) cardData.bio = sanitize(cardData.bio);
    if (cardData.jobTitle) cardData.jobTitle = sanitize(cardData.jobTitle);
    if (cardData.company) cardData.company = sanitize(cardData.company);

    let slug = cardData.slug;

    // TODO: We technically should re-check slug uniqueness here to be safe race-condition wise, 
    // but the frontend check + unique constraint (if it existed) would handle it. 
    // For now, relying on the checkSlug logic existing in the frontend or DB constraint. 
    // Original save-card.ts DID check it.

    if (slug) {
        const existingCard = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        // If updating (cardId exists), ensure we aren't colliding with ANOTHER card
        if (existingCard.length > 0 && (!cardId || existingCard[0].id !== cardId)) {
            return res.status(400).json({ error: 'Slug already taken', suggestion: `${slug}-2` });
        }
    }

    let result;
    if (cardId) {
        // Verify ownership/existence before update? 
        // Original didn't explicitly, but `where` clause with ID makes it safe-ish. 
        // Better to add userID check in the Where clause for security.
        result = await db.update(businessCards)
            .set({ data: cardData, slug: slug || null, updatedAt: new Date() })
            .where(and(eq(businessCards.id, cardId), eq(businessCards.userId, effectiveUserId))) // Added ownership check
            .returning();
    } else {
        result = await db.insert(businessCards)
            .values({ userId: effectiveUserId, data: cardData, slug: slug || null, updatedAt: new Date() })
            .returning();
    }
    return res.status(200).json({ success: true, card: result[0] });
}

async function handleDeleteCard(req: VercelRequest, res: VercelResponse, authenticatedUserId: string) {
    const { cardId, userId: bodyUserId } = req.body;
    if (bodyUserId && bodyUserId !== authenticatedUserId) return res.status(403).json({ error: 'Unauthorized user mismatch' });
    if (!cardId) return res.status(400).json({ error: 'Missing cardId' });

    const effectiveUserId = authenticatedUserId;

    const existingCards = await db.select().from(businessCards)
        .where(and(eq(businessCards.id, cardId), eq(businessCards.userId, effectiveUserId))).limit(1);

    if (existingCards.length === 0) return res.status(404).json({ error: 'Card not found or unauthorized' });

    await Promise.all([
        db.delete(cardViews).where(eq(cardViews.cardId, cardId)),
        db.delete(cardClicks).where(eq(cardClicks.cardId, cardId))
    ]);

    await db.delete(businessCards).where(and(eq(businessCards.id, cardId), eq(businessCards.userId, effectiveUserId)));

    return res.status(200).json({ success: true, message: 'Card deleted successfully' });
}
