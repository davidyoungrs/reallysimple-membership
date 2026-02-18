import { db } from '../src/db/index.js';
import { businessCards, cardViews, cardClicks } from '../src/db/schema.js';
import { eq, sql, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';

// export const config = {
//     runtime: 'edge',
// };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!secureEndpoint(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
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

        const { cardId, slug } = req.query;

        // If cardId or slug is present, fetch specific card analytics
        if (cardId || slug) {
            return await handleGetCardAnalytics(req, res, authenticatedUserId);
        }

        // Otherwise, fetch user-wide analytics
        return await handleGetUserAnalytics(req, res, authenticatedUserId);

    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error?.message });
    }
}

// --- HANDLERS ---

async function handleGetCardAnalytics(req: VercelRequest, res: VercelResponse, userId: string) {
    const slug = req.query.slug as string;
    const cardIdParam = req.query.cardId as string;
    let cardId: number;

    if (slug) {
        const card = await db.select({ id: businessCards.id, userId: businessCards.userId }).from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        if (!card.length) return res.status(404).json({ error: 'Card not found' });

        // Security: Ensure user owns the card? 
        // Original get-analytics.ts did NOT check ownership. 
        // If this is for the dashboard, it SHOULD check ownership.
        if (card[0].userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to card analytics' });
        }
        cardId = card[0].id;
    } else {
        cardId = parseInt(cardIdParam!);
        if (isNaN(cardId)) return res.status(400).json({ error: 'Invalid cardId format' });

        // Check ownership
        const card = await db.select({ userId: businessCards.userId }).from(businessCards).where(eq(businessCards.id, cardId)).limit(1);
        if (!card.length) return res.status(404).json({ error: 'Card not found' });
        if (card[0].userId !== userId) return res.status(403).json({ error: 'Unauthorized access to card analytics' });
    }

    const { startDate, endDate } = getDateRange(req);

    // Fetch Daily Views
    const dailyViews = await db.select({
        date: sql<string>`DATE_TRUNC('day', ${cardViews.viewedAt})::text`,
        count: sql<number>`count(*)`
    }).from(cardViews).where(and(eq(cardViews.cardId, cardId), gte(cardViews.viewedAt, startDate), lte(cardViews.viewedAt, endDate)))
        .groupBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`).orderBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`);

    // Fetch Daily Clicks
    const dailyClicks = await db.select({
        date: sql<string>`DATE_TRUNC('day', ${cardClicks.clickedAt})::text`,
        count: sql<number>`count(*)`
    }).from(cardClicks).where(and(eq(cardClicks.cardId, cardId), gte(cardClicks.clickedAt, startDate), lte(cardClicks.clickedAt, endDate)))
        .groupBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`).orderBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`);

    // Click Breakdown
    const clickBreakdown = await db.select({
        type: cardClicks.type,
        targetInfo: cardClicks.targetInfo,
        count: sql<number>`count(*)`
    }).from(cardClicks).where(and(eq(cardClicks.cardId, cardId), gte(cardClicks.clickedAt, startDate), lte(cardClicks.clickedAt, endDate)))
        .groupBy(cardClicks.type, cardClicks.targetInfo).orderBy(desc(sql`count(*)`));

    // Stats Processing
    const totalViews = dailyViews.reduce((acc, curr) => acc + Number(curr.count), 0);
    const totalClicks = dailyClicks.reduce((acc, curr) => acc + Number(curr.count), 0);
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    const mergedStats = mergeDailyStats(dailyViews, dailyClicks, startDate, endDate);

    // Geo Stats
    const geoStats = await db.select({
        city: cardViews.city, region: cardViews.region, country: cardViews.country,
        latitude: cardViews.latitude, longitude: cardViews.longitude, viewedAt: cardViews.viewedAt,
    }).from(cardViews).where(and(eq(cardViews.cardId, cardId), gte(cardViews.viewedAt, startDate), lte(cardViews.viewedAt, endDate), sql`${cardViews.latitude} IS NOT NULL`))
        .orderBy(desc(cardViews.viewedAt)).limit(100);

    // Device Stats
    const deviceStats = await db.select({ deviceType: cardViews.deviceType, count: sql<number>`count(*)` })
        .from(cardViews).where(and(eq(cardViews.cardId, cardId), gte(cardViews.viewedAt, startDate), lte(cardViews.viewedAt, endDate))).groupBy(cardViews.deviceType);

    // Source Stats
    const sourceStats = await db.select({ source: cardViews.source, count: sql<number>`count(*)` })
        .from(cardViews).where(and(eq(cardViews.cardId, cardId), gte(cardViews.viewedAt, startDate), lte(cardViews.viewedAt, endDate))).groupBy(cardViews.source);

    return res.status(200).json({
        totalViews, totalClicks, ctr: parseFloat(ctr.toFixed(2)), dailyStats: mergedStats,
        clickBreakdown: clickBreakdown.map(item => ({ platform: item.targetInfo, type: item.type, count: Number(item.count) })),
        geoStats: geoStats.map(item => ({ ...item, latitude: item.latitude ? parseFloat(item.latitude) : null, longitude: item.longitude ? parseFloat(item.longitude) : null })),
        deviceStats: deviceStats.map(item => ({ type: item.deviceType || 'unknown', count: Number(item.count) })),
        sourceStats: sourceStats.map(item => ({ source: item.source || 'direct', count: Number(item.count) }))
    });
}

async function handleGetUserAnalytics(req: VercelRequest, res: VercelResponse, userId: string) {
    const userCards = await db.select({ id: businessCards.id, slug: businessCards.slug, name: sql`data->>'name'` }).from(businessCards).where(eq(businessCards.userId, userId));
    if (!userCards.length) return res.status(200).json({ totalViews: 0, totalClicks: 0, dailyStats: [], recentActivity: [] });

    const cardIds = userCards.map(c => c.id);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // User Daily Stats
    const dailyViews = await db.select({ date: sql<string>`DATE_TRUNC('day', ${cardViews.viewedAt})::text`, count: sql<number>`count(*)` })
        .from(cardViews).where(and(inArray(cardViews.cardId, cardIds), gte(cardViews.viewedAt, startDate), lte(cardViews.viewedAt, endDate)))
        .groupBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`).orderBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`);

    const dailyClicks = await db.select({ date: sql<string>`DATE_TRUNC('day', ${cardClicks.clickedAt})::text`, count: sql<number>`count(*)` })
        .from(cardClicks).where(and(inArray(cardClicks.cardId, cardIds), gte(cardClicks.clickedAt, startDate), lte(cardClicks.clickedAt, endDate)))
        .groupBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`).orderBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`);

    // Recent Activity
    const recentViews = await db.select({ type: sql<string>`'view'`, timestamp: cardViews.viewedAt, cardId: cardViews.cardId, details: sql<string>`COALESCE(${cardViews.city}, '') || ', ' || COALESCE(${cardViews.country}, 'Unknown')` })
        .from(cardViews).where(inArray(cardViews.cardId, cardIds)).orderBy(desc(cardViews.viewedAt)).limit(5);

    const recentClicks = await db.select({ type: sql<string>`'click'`, timestamp: cardClicks.clickedAt, cardId: cardClicks.cardId, details: sql<string>`type || ': ' || COALESCE(target_info, '')` })
        .from(cardClicks).where(inArray(cardClicks.cardId, cardIds)).orderBy(desc(cardClicks.clickedAt)).limit(5);

    const cardMap = userCards.reduce((acc: any, card) => { acc[card.id] = { name: card.name || card.slug || 'Untitled', slug: card.slug }; return acc; }, {});
    const combinedActivity = [...recentViews.map(v => ({ ...v, card: cardMap[v.cardId as number] })), ...recentClicks.map(c => ({ ...c, card: cardMap[c.cardId as number] }))]
        .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()).slice(0, 5);

    const totalViews = await db.select({ count: sql<number>`count(*)` }).from(cardViews).where(inArray(cardViews.cardId, cardIds));
    const totalClicks = await db.select({ count: sql<number>`count(*)` }).from(cardClicks).where(inArray(cardClicks.cardId, cardIds));

    const mergedStats = mergeDailyStats(dailyViews, dailyClicks, startDate, endDate);

    return res.status(200).json({ totalViews: Number(totalViews[0].count), totalClicks: Number(totalClicks[0].count), dailyStats: mergedStats, recentActivity: combinedActivity });
}

// --- HELPER FUNCTIONS ---

function getDateRange(req: VercelRequest) {
    let startDate: Date, endDate: Date;
    if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
    }
    return { startDate, endDate };
}

function mergeDailyStats(dailyViews: any[], dailyClicks: any[], startDate: Date, endDate: Date) {
    const mergedStats = [];
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        if (d > endDate) break;
        const dateKey = d.toISOString().split('T')[0];
        const v = dailyViews.find(v => v.date.startsWith(dateKey));
        const c = dailyClicks.find(c => c.date.startsWith(dateKey));
        mergedStats.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: dateKey,
            views: v ? Number(v.count) : 0,
            clicks: c ? Number(c.count) : 0
        });
    }
    return mergedStats;
}
