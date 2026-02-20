import { db } from '../../src/db/index.js';
import { users, businessCards, cardViews, cardClicks, systemSettings, securityEvents, apiLogs } from '../../src/db/schema.js';
import { count, eq, sql, desc, ilike, or, and, gte, inArray } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Initialize Clerk Client with Backend Secret Key
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'POST') {
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

        if (req.method === 'DELETE') {
            return handleDelete(req, res, isAdmin);
        }

        const resource = (req.query.resource as string) || 'stats';

        if (resource === 'stats') {
            // 4. Run Parallel DB Queries & Clerk Count
            const [
                userCount,
                cardStats,
                activeCardStats,
                viewStats,
                clickStats
            ] = await Promise.all([
                clerkClient.users.getCount(),
                db.select({ count: count() }).from(businessCards),
                db.select({ count: count() }).from(businessCards).where(eq(businessCards.isActive, true)),
                db.select({ count: count() }).from(cardViews),
                db.select({ count: count() }).from(cardClicks),
            ]);

            // 5. Get Last 7 Days History for Charts
            // Note: Users history will be empty without webhook sync. 
            // We'll keep the query for now as a placeholder.

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
                users: userCount,
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
            const query = (req.query.q as string) ? (req.query.q as string) : undefined;

            const clerkUsers = await clerkClient.users.getUserList({
                limit,
                offset,
                query,
                orderBy: '-created_at'
            });

            // console.log('Clerk Users Response:', JSON.stringify(clerkUsers, null, 2));

            // Handle potential difference in Clerk SDK versions (getUserList usually returns User[])
            const userData = Array.isArray(clerkUsers) ? clerkUsers : (clerkUsers as any).data;
            const totalCount = Array.isArray(clerkUsers) ? await clerkClient.users.getCount() : (clerkUsers as any).totalCount;

            // Enrich with local tier data
            if (userData.length > 0) {
                const clerkIds = userData.map((u: any) => u.id);
                const localUsers = await db.select({
                    clerkId: users.clerkId,
                    tier: users.tier
                })
                    .from(users)
                    .where(inArray(users.clerkId, clerkIds));

                const tierMap = localUsers.reduce((acc, curr) => {
                    if (curr.clerkId) acc[curr.clerkId] = curr.tier;
                    return acc;
                }, {} as Record<string, string>);

                const enrichedUsers = userData.map((user: any) => ({
                    ...user,
                    tier: tierMap[user.id] || 'starter'
                }));

                return res.status(200).json({
                    data: enrichedUsers,
                    totalCount: totalCount
                });
            }

            return res.status(200).json({
                data: userData,
                totalCount: totalCount
            });
        }

        if (resource === 'cards') {
            const limit = Number(req.query.limit) || 10;
            const offset = Number(req.query.offset) || 0;
            const query = (req.query.q as string) || '';

            const whereClause = query
                ? or(
                    ilike(businessCards.slug, `%${query}%`),
                    sql`${businessCards.data}->>'fullName' ILIKE ${`%${query}%`}`
                )
                : undefined;

            const [cardsData, total] = await Promise.all([
                db.select()
                    .from(businessCards)
                    .where(whereClause)
                    .limit(limit)
                    .offset(offset)
                    .orderBy(desc(businessCards.createdAt)),
                db.select({ count: count() })
                    .from(businessCards)
                    .where(whereClause)
            ]);

            return res.status(200).json({
                data: cardsData,
                totalCount: total[0]?.count || 0
            });
        }

        if (resource === 'user_detail') {
            const userId = req.query.id as string;
            if (!userId) return res.status(400).json({ error: 'Missing user ID' });

            const [clerkUser, userCards, localUser] = await Promise.all([
                clerkClient.users.getUser(userId),
                db.select().from(businessCards).where(eq(businessCards.userId, userId)),
                db.select({ tier: users.tier }).from(users).where(eq(users.clerkId, userId)).limit(1)
            ]);

            return res.status(200).json({
                user: { ...clerkUser, tier: localUser[0]?.tier || 'starter' },
                cards: userCards
            });
        }

        if (resource === 'user_actions') {
            if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

            const { action, userId, value } = req.body;
            if (!userId || !action) return res.status(400).json({ error: 'Missing parameters' });

            if (action === 'toggle_status') {
                // Toggle isActive in publicMetadata
                const user = await clerkClient.users.getUser(userId);
                const currentMetadata = user.publicMetadata || {};

                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        ...currentMetadata,
                        isActive: value
                    }
                });
                return res.status(200).json({ success: true });
            }

            if (action === 'ban') {
                await clerkClient.users.banUser(userId);
                return res.status(200).json({ success: true });
            }

            if (action === 'unban') {
                await clerkClient.users.unbanUser(userId);
                return res.status(200).json({ success: true });
            }

            if (action === 'reset_password') {
                // Generate a temporary password
                const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

                // Update user with new password
                await clerkClient.users.updateUser(userId, {
                    password: tempPassword,
                    skipPasswordChecks: true
                });

                return res.status(200).json({ success: true, temporaryPassword: tempPassword });
            }

            if (action === 'toggle_feature') {
                const { feature, enabled } = value;
                const user = await clerkClient.users.getUser(userId);
                const currentMetadata = user.publicMetadata || {};
                const currentFeatures = (currentMetadata as any).features || {};

                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        ...currentMetadata,
                        features: {
                            ...currentFeatures,
                            [feature]: enabled
                        }
                    }
                });
                return res.status(200).json({ success: true });
            }

            if (action === 'update_tier') {
                const { tier } = value;
                if (!tier) return res.status(400).json({ error: 'Missing tier value' });

                const availableTiers = ['starter', 'pro', 'pro_plus', 'business', 'grandfathered'];
                if (!availableTiers.includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

                // Fetch current user from Clerk to get email for the local DB
                const clerkUser = await clerkClient.users.getUser(userId);
                const email = clerkUser.emailAddresses?.[0]?.emailAddress || 'admin-updated@pending.com';

                await db.insert(users)
                    .values({ clerkId: userId, tier, email })
                    .onConflictDoUpdate({
                        target: users.clerkId,
                        set: { tier }
                    });

                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        if (resource === 'settings') {
            if (req.method === 'POST') {
                const { key, value } = req.body;
                if (!key || value === undefined) {
                    return res.status(400).json({ error: 'Missing key or value' });
                }

                await db.insert(systemSettings)
                    .values({ key, value })
                    .onConflictDoUpdate({
                        target: systemSettings.key,
                        set: { value, updatedAt: new Date() }
                    });

                return res.status(200).json({ success: true });
            }

            const settings = await db.select().from(systemSettings);
            const settingsMap = settings.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            return res.status(200).json(settingsMap);
        }

        if (resource === 'security_stats') {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Parallel queries for performance
            const [
                blockedIps,
                sanitizationLogs,
                apiPerformanceData
            ] = await Promise.all([
                // 1. Blocked IPs (last 24h)
                db.select({
                    ip: securityEvents.target,
                    reason: sql<string>`details->>'reason'`,
                    timestamp: securityEvents.createdAt,
                    location: sql<string>`details->>'location'`
                })
                    .from(securityEvents)
                    .where(and(
                        eq(securityEvents.type, 'blocked_ip'),
                        gte(securityEvents.createdAt, twentyFourHoursAgo)
                    ))
                    .orderBy(desc(securityEvents.createdAt))
                    .limit(5), // Top 5 recent blocks

                // 2. Sanitization Logs (last 24h)
                db.select({
                    id: securityEvents.id,
                    field: securityEvents.target,
                    input: sql<string>`details->>'input'`,
                    output: sql<string>`details->>'output'`,
                    user: sql<string>`details->>'userId'`,
                    timestamp: securityEvents.createdAt
                })
                    .from(securityEvents)
                    .where(and(
                        eq(securityEvents.type, 'sanitization_auto_fix'),
                        gte(securityEvents.createdAt, twentyFourHoursAgo)
                    ))
                    .orderBy(desc(securityEvents.createdAt))
                    .limit(10),

                // 3. API Performance (Aggregation)
                // Note: In a real app we'd group by endpoint. 
                // For now, if table is empty, we might return empty array.
                db.select({
                    name: apiLogs.endpoint,
                    avgTime: sql<number>`CAST(AVG(duration) AS INTEGER)`,
                    calls: count()
                })
                    .from(apiLogs)
                    .where(gte(apiLogs.createdAt, twentyFourHoursAgo))
                    .groupBy(apiLogs.endpoint)
                    .orderBy(desc(count()))
                    .limit(5)
            ]);

            // Calculate active sessions (mock estimation based on distinct IPs in last 15 mins)
            // or just use Clerk count if available? 
            // Clerk doesn't give "active sessions" count easily in one call without iterating.
            // We'll estimate based on recent API logs if available, or fallback to 0.
            const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
            const activeSessionsResult = await db.select({ count: count(sql`DISTINCT ${apiLogs.ipAddress}`) })
                .from(apiLogs)
                .where(gte(apiLogs.createdAt, fifteenMinsAgo));

            const activeSessions = activeSessionsResult[0]?.count || 0;

            // Security Status Logic
            const highSeverityCount = await db.select({ count: count() })
                .from(securityEvents)
                .where(and(
                    eq(securityEvents.severity, 'critical'),
                    eq(securityEvents.resolved, false)
                ));

            const systemStatus = (highSeverityCount[0]?.count || 0) > 0 ? 'critical' : 'secure';

            return res.status(200).json({
                status: systemStatus,
                lastAudit: new Date().toISOString(),
                activeSessions: activeSessions,
                failedLoginAttempts: 0, // Need integration with Clerk webhooks for this
                blockedIps: blockedIps,
                apiPerformance: apiPerformanceData,
                sanitizationLogs: sanitizationLogs
            });
        }

        if (resource === 'global_analytics') {
            const [recentUsers, recentViews, heatmapData] = await Promise.all([
                // Recent Signups
                db.select()
                    .from(users)
                    .orderBy(desc(users.createdAt))
                    .limit(5),

                // Recent Views with Card Details (join would be better but separate query is easier for now)
                db.select({
                    viewedAt: cardViews.viewedAt,
                    city: cardViews.city,
                    country: cardViews.country,
                    cardId: cardViews.cardId,
                    flag: cardViews.country // placeholder for flag logic if needed, or just use country code
                })
                    .from(cardViews)
                    .orderBy(desc(cardViews.viewedAt))
                    .limit(10),

                // Heatmap Data (lat/lng)
                db.select({
                    lat: cardViews.latitude,
                    lng: cardViews.longitude,
                    count: count()
                })
                    .from(cardViews)
                    .where(sql`${cardViews.latitude} IS NOT NULL AND ${cardViews.longitude} IS NOT NULL`)
                    .groupBy(cardViews.latitude, cardViews.longitude)
            ]);

            // Fetch card details for the views (to show card name)
            const cardIds = recentViews.map(v => v.cardId).filter((id): id is number => id !== null);
            const cardsInfo = cardIds.length > 0
                ? await db.select({ id: businessCards.id, data: businessCards.data }).from(businessCards).where(sql`${businessCards.id} IN ${cardIds}`)
                : [];

            const enrichedViews = recentViews.map(view => {
                const card = cardsInfo.find(c => c.id === view.cardId);
                const cardName = (card?.data as any)?.fullName || (card?.data as any)?.name || 'Unknown Card';
                return { ...view, cardName };
            });

            return res.status(200).json({
                recentUsers,
                recentViews: enrichedViews,
                heatmapData,
                deviceStats: await db.select({
                    name: cardViews.deviceType,
                    value: count()
                })
                    .from(cardViews)
                    .groupBy(cardViews.deviceType)
                    .orderBy(desc(count())),
                browserStats: await db.select({
                    name: cardViews.userAgent, // Simplified: In real app, parse UA. For now, grouping by raw UA or source if available
                    value: count()
                })
                    .from(cardViews)
                    .groupBy(cardViews.userAgent)
                    .orderBy(desc(count()))
                    .limit(5)
            });
        }

        return res.status(400).json({ error: 'Invalid resource' });

    } catch (error: any) {
        console.error('Admin API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Separate function to handle DELETE manually since we can't easily export multiple handlers
// effectively we just check method at top, but for clarity logic is here:
async function handleDelete(req: VercelRequest, res: VercelResponse, isAdmin: boolean) {
    if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Missing card ID' });
    }

    try {
        console.log('Admin deleting card:', id);

        // Delete analytics first (if not cascading)
        await Promise.all([
            db.delete(cardViews).where(eq(cardViews.cardId, id)),
            db.delete(cardClicks).where(eq(cardClicks.cardId, id))
        ]);

        await db.delete(businessCards).where(eq(businessCards.id, id));

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Delete Error:', error);
        return res.status(500).json({ error: 'Failed to delete card' });
    }
}
