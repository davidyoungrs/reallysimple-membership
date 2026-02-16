import { db } from '../src/db/index.js';
import { businessCards, cardViews, cardClicks } from '../src/db/schema.js';
import { verifyToken } from '@clerk/backend';
import { eq, sql, and, gte, lte, desc, inArray } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Clerk
        let verifiedToken;
        try {
            verifiedToken = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });
        } catch (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userId = verifiedToken.sub;

        // 1. Get all cards for this user
        const userCards = await db.select({ id: businessCards.id, slug: businessCards.slug, name: sql`data->>'name'` })
            .from(businessCards)
            .where(eq(businessCards.userId, userId));

        if (!userCards.length) {
            return res.status(200).json({
                totalViews: 0,
                totalClicks: 0,
                dailyStats: [],
                recentActivity: []
            });
        }

        const cardIds = userCards.map(c => c.id);

        // 2. Aggregate Daily Stats (User-wide)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const dailyViews = await db.select({
            date: sql<string>`DATE_TRUNC('day', ${cardViews.viewedAt})::text`,
            count: sql<number>`count(*)`
        })
            .from(cardViews)
            .where(and(
                inArray(cardViews.cardId, cardIds),
                gte(cardViews.viewedAt, startDate),
                lte(cardViews.viewedAt, endDate)
            ))
            .groupBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`)
            .orderBy(sql`DATE_TRUNC('day', ${cardViews.viewedAt})`);

        const dailyClicks = await db.select({
            date: sql<string>`DATE_TRUNC('day', ${cardClicks.clickedAt})::text`,
            count: sql<number>`count(*)`
        })
            .from(cardClicks)
            .where(and(
                inArray(cardClicks.cardId, cardIds),
                gte(cardClicks.clickedAt, startDate),
                lte(cardClicks.clickedAt, endDate)
            ))
            .groupBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`)
            .orderBy(sql`DATE_TRUNC('day', ${cardClicks.clickedAt})`);

        // 3. Get Recent Activity (Last 5 combined)
        // We'll fetch 5 views and 5 clicks, then sort and slice in JS for simplicity
        const recentViews = await db.select({
            type: sql<string>`'view'`,
            timestamp: cardViews.viewedAt,
            cardId: cardViews.cardId,
            details: sql<string>`COALESCE(${cardViews.city}, '') || ', ' || COALESCE(${cardViews.country}, 'Unknown')`
        })
            .from(cardViews)
            .where(inArray(cardViews.cardId, cardIds))
            .orderBy(desc(cardViews.viewedAt))
            .limit(5);

        const recentClicks = await db.select({
            type: sql<string>`'click'`,
            timestamp: cardClicks.clickedAt,
            cardId: cardClicks.cardId,
            details: sql<string>`type || ': ' || COALESCE(target_info, '')`
        })
            .from(cardClicks)
            .where(inArray(cardClicks.cardId, cardIds))
            .orderBy(desc(cardClicks.clickedAt))
            .limit(5);

        // Map card names/slugs to IDs for activity feed
        const cardMap = userCards.reduce((acc: any, card) => {
            acc[card.id] = { name: card.name || card.slug || 'Untitled', slug: card.slug };
            return acc;
        }, {});

        const combinedActivity = [
            ...recentViews.map(v => ({ ...v, card: cardMap[v.cardId as number] })),
            ...recentClicks.map(c => ({ ...c, card: cardMap[c.cardId as number] }))
        ]
            .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())
            .slice(0, 5);

        // Total Counts
        const totalViews = await db.select({ count: sql<number>`count(*)` })
            .from(cardViews)
            .where(inArray(cardViews.cardId, cardIds));

        const totalClicks = await db.select({ count: sql<number>`count(*)` })
            .from(cardClicks)
            .where(inArray(cardClicks.cardId, cardIds));

        // Generate dailyStats array
        const mergedStats = [];
        for (let i = 0; i <= 30; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
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

        return res.status(200).json({
            totalViews: Number(totalViews[0].count),
            totalClicks: Number(totalClicks[0].count),
            dailyStats: mergedStats,
            recentActivity: combinedActivity
        });

    } catch (error: any) {
        console.error('Error fetching user analytics:', error);
        return res.status(500).json({ error: 'Internal server error', details: error?.message });
    }
}
