import { db } from '../../src/db/index.js';
import { users, businessCards, cardViews, cardClicks } from '../../src/db/schema.js';
import { count, eq, sql } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Initialize Clerk Client with Backend Secret Key
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const token = authHeader.split(' ')[1];

        // 1. Verify token & get claims
        const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });

        // 2. Ideally, check claims, but to be sure we fetch the User object
        const user = await clerkClient.users.getUser(verifiedToken.sub);

        // 3. Verify Admin Role
        const isAdmin = user.publicMetadata?.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const resource = (req.query.resource as string) || 'stats';

        if (resource === 'stats') {
            // 4. Run Parallel DB Queries
            const [
                userStats,
                cardStats,
                activeCardStats,
                viewStats,
                clickStats
            ] = await Promise.all([
                db.select({ count: count() }).from(users),
                db.select({ count: count() }).from(businessCards),
                db.select({ count: count() }).from(businessCards).where(eq(businessCards.isActive, true)),
                db.select({ count: count() }).from(cardViews),
                db.select({ count: count() }).from(cardClicks),
            ]);

            // 5. Get Last 7 Days History for Charts
            // Note: In Drizzle with Postgres, generating series is complex without raw SQL.
            // For now, we'll just fetch raw counts grouped by date via SQL.

            // Users History
            const usersHistory = await db.execute(sql`
                SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
                FROM users
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY date
                ORDER BY date ASC
            `);

            // Views History
            const viewsHistory = await db.execute(sql`
                SELECT TO_CHAR(viewed_at, 'YYYY-MM-DD') as date, COUNT(*) as count
                FROM card_views
                WHERE viewed_at > NOW() - INTERVAL '30 days'
                GROUP BY date
                ORDER BY date ASC
            `);

            return res.status(200).json({
                users: userStats[0]?.count || 0,
                totalCards: cardStats[0]?.count || 0,
                activeCards: activeCardStats[0]?.count || 0,
                views: viewStats[0]?.count || 0,
                clicks: clickStats[0]?.count || 0,
                charts: {
                    users: usersHistory.rows,
                    views: viewsHistory.rows
                }
            });
        }

        if (resource === 'users') {
            // Fetch users from Clerk
            const limit = Number(req.query.limit) || 10;
            const offset = Number(req.query.offset) || 0;
            const query = (req.query.q as string) || '';

            const clerkUsers = await clerkClient.users.getUserList({
                limit,
                offset,
                query,
                orderBy: '-created_at'
            });

            return res.status(200).json({
                data: clerkUsers.data,
                totalCount: clerkUsers.totalCount
            });
        }

        return res.status(400).json({ error: 'Invalid resource' });

    } catch (error: any) {
        console.error('Admin API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
