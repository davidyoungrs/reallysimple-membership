import { db } from '../src/db/index.js';
import { businessCards, cardViews, cardClicks, users, walletPushRegistrations } from '../src/db/schema.js';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import { secureEndpoint, validatePayload } from './_utils/security.js';
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
    if (!validatePayload(req, res, { maxBytes: 2 * 1024 * 1024 })) return;

    const { method } = req;
    const query = req.query;

    try {
        // --- PUBLIC ENDPOINTS ---

        // A. TRACKING (POST with ?action=track)
        if (method === 'POST' && (query.action === 'track' || req.body?.action === 'track')) {
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

        // Admin check for concierge/management
        let isAdmin = false;
        try {
            const { createClerkClient } = await import('@clerk/backend');
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            const requester = await clerk.users.getUser(authenticatedUserId);
            isAdmin = requester.publicMetadata?.role === 'admin';
        } catch (err) {
            console.error('Admin check failed:', err);
        }

        // D. LIST CARDS (GET /api/cards)
        if (method === 'GET') {
            const targetUserId = (isAdmin && query.userId) ? (query.userId as string) : authenticatedUserId;
            return await handleListCards(req, res, targetUserId);
        }

        // E. SAVE CARD (POST /api/cards) or SYNC WALLET (POST /api/cards?action=sync)
        if (method === 'POST') {
            if (query.action === 'sync' || req.body?.action === 'sync') {
                return await handleWalletSync(req, res, authenticatedUserId);
            }
            return await handleSaveCard(req, res, authenticatedUserId, isAdmin);
        }

        // F. DELETE CARD (DELETE /api/cards)
        if (method === 'DELETE') {
            return await handleDeleteCard(req, res, authenticatedUserId, isAdmin);
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
        // If action is 'track', it's coming from PublicCard.tsx which sends type='view' or type='click'
        // We should use 'action' if it's view/click, otherwise use 'type'
        const effectiveAction = (action === 'view' || action === 'click') ? action : (actionType === 'view' || actionType === 'click' ? actionType : 'view');

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
            const clickType = actionType || req.body.typeDetail || 'unknown';
            await db.insert(cardClicks).values({ cardId, type: clickType, targetInfo, userAgent });
        } else {
            return res.status(400).json({ error: `Invalid action: ${effectiveAction}` });
        }
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Track error:', error);
        return res.status(500).json({ success: false, error: 'Database tracking failed', details: error?.message });
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

    const cards = await db.select({
        id: businessCards.id,
        uid: businessCards.uid,
        userId: businessCards.userId,
        data: businessCards.data,
        slug: businessCards.slug,
        ownerTier: users.tier,
        subscriptionStatus: users.subscriptionStatus,
        currentPeriodEnd: users.currentPeriodEnd
    })
        .from(businessCards)
        .leftJoin(users, eq(users.clerkId, businessCards.userId))
        .where(eq(businessCards.slug, slug))
        .limit(1);

    if (cards.length === 0) return res.status(404).json({ error: 'Card not found' });

    const card = cards[0];
    const { getEffectiveTier, applyTierLimits } = await import('../src/utils/tier-limits.js');

    let effectiveTier = getEffectiveTier({
        tier: (card.ownerTier as any) || 'starter',
        status: card.subscriptionStatus as any,
        currentPeriodEnd: card.currentPeriodEnd
    });

    // Handle Admin Simulation
    const { sim_tier, sim_status, sim_end, simulator } = req.query;
    if (simulator === 'true' && (sim_tier || sim_status || sim_end)) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const { verifyToken, createClerkClient } = await import('@clerk/backend');
                const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
                const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                const requester = await clerk.users.getUser(verifiedToken.sub);

                if (requester.publicMetadata?.role === 'admin') {
                    effectiveTier = getEffectiveTier({
                        tier: (sim_tier as any) || effectiveTier,
                        status: (sim_status as any) || 'active',
                        currentPeriodEnd: sim_end ? new Date(sim_end as string) : null
                    });
                }
            } catch (err) {
                console.error('Simulator Auth Error:', err);
            }
        }
    }

    // Apply limits to data
    const limitedData = applyTierLimits(card.data as any, effectiveTier);

    return res.status(200).json({
        success: true,
        card: {
            ...card,
            data: limitedData,
            ownerTier: effectiveTier // Override with effective tier for UI
        }
    });
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

async function handleSaveCard(req: VercelRequest, res: VercelResponse, authenticatedUserId: string, isAdmin: boolean = false) {
    const { cardData, cardId, userId: bodyUserId } = req.body;

    // Security check: ensure the userId in body (if present) matches the token, UNLESS admin
    if (!isAdmin && bodyUserId && bodyUserId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Unauthorized user mismatch' });
    }
    const effectiveUserId = (isAdmin && bodyUserId) ? bodyUserId : authenticatedUserId;

    if (!cardData) return res.status(400).json({ error: 'Missing card data' });
    
    // Fetch current user tier
    const currentUserData = await db.select({ tier: users.tier }).from(users).where(eq(users.clerkId, authenticatedUserId)).limit(1);
    const userTier = currentUserData[0]?.tier || 'starter';

    // BACKEND LIMIT ENFORCEMENT
    if (!cardId) {
        // Fetch card count for new cards
        
        const existingCardsCount = await db.select({ count: sql<number>`count(*)` })
            .from(businessCards)
            .where(eq(businessCards.userId, authenticatedUserId));
        
        const count = Number(existingCardsCount[0]?.count || 0);

        // Limit definitions
        const limitMap: Record<string, number> = {
            'starter': 1,
            'pro': 5,
            'pro_plus': 10,
            'business': 999999, // Practically unlimited
            'grandfathered': 999999
        };

        if (count >= (limitMap[userTier as string] || 1) && !isAdmin) {
            return res.status(403).json({ 
                error: 'Card limit reached', 
                message: `You have reached the limit of ${limitMap[userTier as string]} cards for your tier. Please upgrade for more.`,
                limit: limitMap[userTier as string],
                current: count
            });
        }
    }

    // Sanitize
    if (cardData.fullName) cardData.fullName = sanitize(cardData.fullName);
    if (cardData.bio) cardData.bio = sanitize(cardData.bio);
    if (cardData.jobTitle) cardData.jobTitle = sanitize(cardData.jobTitle);
    if (cardData.company) cardData.company = sanitize(cardData.company);

    let slug = cardData.slug;

    // SLUG ENFORCEMENT: Starter gets 16-char random, Pro+ can have custom
    if (userTier === 'starter' && !isAdmin) {
        const { generateRandomSlug } = await import('../src/utils/slugUtils.js');
        
        // If it's a new card, or if it's an update and they don't have a 16-char slug yet
        // we force a random one. Or if they're trying to change it.
        let needsNewSlug = !cardId || !slug || slug.length !== 16;
        
        if (cardId) {
            const existing = await db.select({ slug: businessCards.slug }).from(businessCards).where(eq(businessCards.id, cardId)).limit(1);
            if (existing[0]?.slug && existing[0].slug.length === 16) {
                // Keep existing 16-char slug
                slug = existing[0].slug;
                needsNewSlug = false;
            }
        }

        if (needsNewSlug) {
            let unique = false;
            let attempts = 0;
            while (!unique && attempts < 5) {
                const candidate = generateRandomSlug(16);
                const collision = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.slug, candidate)).limit(1);
                if (collision.length === 0) {
                    slug = candidate;
                    unique = true;
                }
                attempts++;
            }
        }
        // Update the cardData object so the slug is reflected in those fields too if saved as JSON
        cardData.slug = slug;
    }

    if (slug) {
        const existingCard = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        // If updating (cardId exists), ensure we aren't colliding with ANOTHER card
        if (existingCard.length > 0 && (!cardId || existingCard[0].id !== cardId)) {
            return res.status(400).json({ error: 'Slug already taken', suggestion: `${slug}-2` });
        }
    }

    let result;
    if (cardId) {
        // Admin bypass or ownership check
        const whereClause = isAdmin ? eq(businessCards.id, cardId) : and(eq(businessCards.id, cardId), eq(businessCards.userId, authenticatedUserId));
        result = await db.update(businessCards)
            .set({ data: cardData, slug: slug || null, updatedAt: new Date() })
            .where(whereClause)
            .returning();
    } else {
        result = await db.insert(businessCards)
            .values({ userId: effectiveUserId, data: cardData, slug: slug || null, updatedAt: new Date() })
            .returning();
    }
    return res.status(200).json({ success: true, card: result[0] });
}

async function handleDeleteCard(req: VercelRequest, res: VercelResponse, authenticatedUserId: string, isAdmin: boolean = false) {
    // Support both body.cardId and query.id (Dashboard sends ?id=)
    const cardId = req.body?.cardId ?? (req.query?.id ? Number(req.query.id) : undefined);
    const bodyUserId = req.body?.userId;
    if (!isAdmin && bodyUserId && bodyUserId !== authenticatedUserId) return res.status(403).json({ error: 'Unauthorized user mismatch' });
    if (!cardId) return res.status(400).json({ error: 'Missing cardId' });

    const whereClause = isAdmin ? eq(businessCards.id, cardId) : and(eq(businessCards.id, cardId), eq(businessCards.userId, authenticatedUserId));

    const existingCards = await db.select().from(businessCards)
        .where(whereClause).limit(1);

    if (existingCards.length === 0) return res.status(404).json({ error: 'Card not found or unauthorized' });

    await Promise.all([
        db.delete(cardViews).where(eq(cardViews.cardId, cardId)),
        db.delete(cardClicks).where(eq(cardClicks.cardId, cardId))
    ]);

    await db.delete(businessCards).where(whereClause);

    return res.status(200).json({ success: true, message: 'Card deleted successfully' });
}

async function handleWalletSync(req: VercelRequest, res: VercelResponse, userId: string) {
    try {
        const { cardId } = req.body || {};

        let cardFilter = eq(businessCards.userId, userId);
        if (cardId) {
            const targetCard = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.id, cardId)).limit(1);
            if (!targetCard.length) return res.status(404).json({ error: 'Card not found' });
            cardFilter = sql`${businessCards.id} = ${cardId} AND ${businessCards.userId} = ${userId}`;
        }

        const devices = await db.select({
            id: walletPushRegistrations.id,
            pushToken: walletPushRegistrations.pushToken,
            passType: walletPushRegistrations.passTypeIdentifier
        })
            .from(walletPushRegistrations)
            .innerJoin(businessCards, sql`${walletPushRegistrations.serialNumber} = ${businessCards.uid}::text`)
            .where(cardFilter);

        if (devices.length === 0) {
            return res.status(200).json({ success: true, message: 'No devices strictly registered to this card.', count: 0 });
        }

        const registrationIds = devices.map(d => d.id);
        if (registrationIds.length > 0) {
            await db.update(walletPushRegistrations)
                .set({ updatedAt: new Date() })
                .where(inArray(walletPushRegistrations.id, registrationIds));
        }

        const { sendPassPush } = await import('./_utils/apns.js');
        let successCount = 0;
        let failCount = 0;

        for (const device of devices) {
            try {
                await sendPassPush(device.pushToken, device.passType);
                successCount++;
            } catch (pushErr) {
                console.error(`[Push] Failed to send push to ${device.pushToken.substring(0, 8)}:`, pushErr);
                failCount++;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Update pushed to ${successCount} devices.`,
            count: successCount,
            failures: failCount 
        });

    } catch (error: any) {
        console.error('Wallet Sync error:', error);
        return res.status(500).json({ error: 'Failed to synchronize wallet devices', details: error.message });
    }
}
