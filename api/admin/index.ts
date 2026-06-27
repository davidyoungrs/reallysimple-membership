import { db } from '../../src/db/index.js';
import { users, businessCards, cardViews, cardClicks, systemSettings, securityEvents, apiLogs, walletPushRegistrations, clubs, clubAdmins } from '../../src/db/schema.js';
import { count, eq, sql, desc, ilike, or, and, gte, inArray } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { sendPassPush } from '../_utils/apns.js';
import { checkRateLimit, validatePayload, isBot, setupResponseLogging } from '../_utils/security.js';

// Initialize Clerk Client with Backend Secret Key
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setupResponseLogging(req, res);

    if (isBot(req)) {
        return res.status(403).json({ error: 'Access Denied: Automated tools are blocked.' });
    }

    if (!(await checkRateLimit(req, res))) return;
    if (!validatePayload(req, res)) return;


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

        // 2. Fetch User object
        const user = await clerkClient.users.getUser(verifiedToken.sub);
 
        // 3. Verify Admin Role
        const superuserEmail = (process.env.SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk').toLowerCase();
        const emails = user.emailAddresses?.map(e => e.emailAddress.toLowerCase()) || [];
        const isPrimarySuperUser = emails.includes(superuserEmail);
        const isSuperUser = isPrimarySuperUser || user.publicMetadata?.role === 'super_admin';
        const isAdmin = user.publicMetadata?.role === 'admin' || isSuperUser;
 
        if (!isSuperUser) {
            return res.status(403).json({ error: 'Forbidden: Super User access required' });
        }

        if (req.method === 'DELETE') {
            return handleDelete(req, res, isAdmin);
        }

        // push_test requires superuser auth (was previously unauthenticated — security fix)
        if (req.method === 'POST' && (req.query.resource as string) === 'push_test') {
            return handlePushTest(req, res);
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
            const userData = (Array.isArray(clerkUsers) ? clerkUsers : (clerkUsers as any)?.data) || [];
            const totalCount = Array.isArray(clerkUsers) ? await clerkClient.users.getCount() : (clerkUsers as any)?.totalCount || 0;

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

            const [clerkUser, userCards, localUser, assignedClubs] = await Promise.all([
                clerkClient.users.getUser(userId),
                db.select().from(businessCards).where(eq(businessCards.userId, userId)),
                db.select({ tier: users.tier }).from(users).where(eq(users.clerkId, userId)).limit(1),
                db.select({
                    id: clubs.id,
                    name: clubs.name,
                    slug: clubs.slug
                })
                .from(clubAdmins)
                .innerJoin(clubs, eq(clubAdmins.clubId, clubs.id))
                .where(eq(clubAdmins.clerkId, userId))
            ]);

            return res.status(200).json({
                user: { ...clerkUser, tier: localUser[0]?.tier || 'starter' },
                cards: userCards,
                assignedClubs
            });
        }

        if (resource === 'user_actions') {
            if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

            const { action, userId, value } = req.body;
            if (!userId || !action) return res.status(400).json({ error: 'Missing parameters' });

            // Restrict role & assignment modifications to superusers
            if (['toggle_admin_role', 'toggle_super_admin_role', 'assign_club', 'unassign_club'].includes(action)) {
                if (!isSuperUser) {
                    return res.status(403).json({ error: 'Forbidden: Super User access required' });
                }
            }

            if (action === 'toggle_admin_role') {
                const { role } = value;
                const userObj = await clerkClient.users.getUser(userId);
                const currentMetadata = userObj.publicMetadata || {};
                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        ...currentMetadata,
                        role: role === 'admin' ? 'admin' : null
                    }
                });
                return res.status(200).json({ success: true });
            }

            if (action === 'toggle_super_admin_role') {
                if (!isPrimarySuperUser) {
                    return res.status(403).json({ error: 'Forbidden: Only the primary Super User can delegate super admin rights' });
                }
                const { role } = value;
                const userObj = await clerkClient.users.getUser(userId);
                const currentMetadata = userObj.publicMetadata || {};
                await clerkClient.users.updateUser(userId, {
                    publicMetadata: {
                        ...currentMetadata,
                        role: role === 'super_admin' ? 'super_admin' : null
                    }
                });
                return res.status(200).json({ success: true });
            }

            if (action === 'assign_club') {
                const { clubId } = value;
                if (!clubId) return res.status(400).json({ error: 'Missing clubId' });
                const existingAssignment = await db.select()
                    .from(clubAdmins)
                    .where(and(eq(clubAdmins.clubId, Number(clubId)), eq(clubAdmins.clerkId, userId)))
                    .limit(1);
                
                if (existingAssignment.length === 0) {
                    await db.insert(clubAdmins).values({
                        clubId: Number(clubId),
                        clerkId: userId,
                        role: 'admin'
                    });
                }

                // Automatically promote to admin role in Clerk if they are not already admin/super_admin
                try {
                    const clerkUser = await clerkClient.users.getUser(userId);
                    const currentRole = clerkUser.publicMetadata?.role;
                    if (currentRole !== 'super_admin' && currentRole !== 'admin') {
                        await clerkClient.users.updateUser(userId, {
                            publicMetadata: {
                                ...clerkUser.publicMetadata,
                                role: 'admin'
                            }
                        });
                        console.log(`[Admin-Assign] Automatically set Clerk role to 'admin' for user ${userId} on club assignment`);
                    }
                } catch (err) {
                    console.error('[Admin-Assign] Failed to automatically promote user role:', err);
                }

                return res.status(200).json({ success: true });
            }

            if (action === 'unassign_club') {
                const { clubId } = value;
                if (!clubId) return res.status(400).json({ error: 'Missing clubId' });
                await db.delete(clubAdmins).where(and(
                    eq(clubAdmins.clubId, Number(clubId)),
                    eq(clubAdmins.clerkId, userId)
                ));
                return res.status(200).json({ success: true });
            }

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

            if (action === 'create_concierge_card') {
                const { cardData } = value;
                if (!cardData) return res.status(400).json({ error: 'Missing card data' });

                // 1. Generate Slug
                const name = cardData.fullName || 'card';
                let baseSlug = name.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Ensure slug isn't empty
                if (!baseSlug) baseSlug = 'user';

                let finalSlug = baseSlug;
                let counter = 1;

                // Check for collision
                while (true) {
                    const existing = await db.select({ id: businessCards.id })
                        .from(businessCards)
                        .where(eq(businessCards.slug, finalSlug))
                        .limit(1);

                    if (existing.length === 0) break;
                    finalSlug = `${baseSlug}-${counter++}`;
                }

                // 2. Insert Card
                const [newCard] = await db.insert(businessCards)
                    .values({
                        userId: userId, // The target user's Clerk ID
                        slug: finalSlug,
                        data: cardData,
                        isActive: true
                    })
                    .returning();

                return res.status(200).json({ success: true, cardId: newCard.id, slug: finalSlug });
            }

            if (action === 'create_concierge_user_and_card') {
                const { email, fullName, cardData } = value;
                if (!email || !fullName || !cardData) {
                    return res.status(400).json({ error: 'Missing required fields (email, fullName, cardData)' });
                }

                // 1. Create Clerk User
                const tempPassword = `Temp-${Math.random().toString(36).slice(-8)}!${Math.random().toString(36).slice(-4).toUpperCase()}`;

                let clerkUserId: string;
                try {
                    const newUser = await clerkClient.users.createUser({
                        emailAddress: [email],
                        firstName: fullName.split(' ')[0],
                        lastName: fullName.split(' ').slice(1).join(' '),
                        password: tempPassword,
                        skipPasswordChecks: true,
                        publicMetadata: {
                            role: 'user',
                            onboardingComplete: true,
                            concierge: true
                        }
                    });
                    clerkUserId = newUser.id;
                } catch (err: any) {
                    return res.status(400).json({ error: 'User creation failed: ' + (err.errors?.[0]?.message || err.message) });
                }

                // 2. Sync to local DB
                await db.insert(users)
                    .values({
                        clerkId: clerkUserId,
                        email: email,
                        tier: 'pro'
                    })
                    .onConflictDoNothing();

                // 3. Generate Slug & Insert Card
                const baseSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user';
                let finalSlug = baseSlug;
                let counter = 1;
                while (true) {
                    const existing = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.slug, finalSlug)).limit(1);
                    if (existing.length === 0) break;
                    finalSlug = `${baseSlug}-${counter++}`;
                }

                const [newCard] = await db.insert(businessCards)
                    .values({
                        userId: clerkUserId,
                        slug: finalSlug,
                        data: { ...cardData, fullName },
                        isActive: true
                    })
                    .returning();

                return res.status(200).json({
                    success: true,
                    userId: clerkUserId,
                    cardId: newCard.id,
                    slug: finalSlug,
                    temporaryPassword: tempPassword
                });
            }

            if (action === 'duplicate_card') {
                const { sourceCardId, targetUserId } = value;
                if (!sourceCardId) return res.status(400).json({ error: 'Missing sourceCardId' });

                // 1. Fetch Source Card
                const [sourceCard] = await db.select().from(businessCards).where(eq(businessCards.id, sourceCardId)).limit(1);
                if (!sourceCard) return res.status(404).json({ error: 'Source card not found' });

                // 2. Prepare New Data
                const newUserId = targetUserId || sourceCard.userId;
                const originalData = sourceCard.data as any;
                
                // 3. Generate New Slug
                const baseSlug = (sourceCard.slug || 'card') + '-copy';
                let finalSlug = baseSlug;
                let counter = 1;
                while (true) {
                    const existing = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.slug, finalSlug)).limit(1);
                    if (existing.length === 0) break;
                    finalSlug = `${baseSlug}-${counter++}`;
                }

                // 4. Insert Duplicate
                const [newCard] = await db.insert(businessCards)
                    .values({
                        userId: newUserId,
                        slug: finalSlug,
                        data: { ...originalData, slug: finalSlug },
                        isActive: true
                    })
                    .returning();

                return res.status(200).json({ 
                    success: true, 
                    cardId: newCard.id, 
                    slug: finalSlug,
                    targetUserId: newUserId
                });
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
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [recentUsers, recentViews, heatmapData, sourceStats, topCardsRaw] = await Promise.all([
                // Recent Signups (Enriched with tier if possible, otherwise just users)
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
                    .groupBy(cardViews.latitude, cardViews.longitude),

                // Traffic Sources Distribution
                db.select({
                    name: cardViews.source,
                    value: count()
                })
                    .from(cardViews)
                    .groupBy(cardViews.source)
                    .orderBy(desc(count())),

                // Top Performing Cards (Leaderboard)
                db.select({
                    cardId: cardViews.cardId,
                    views: count()
                })
                    .from(cardViews)
                    .where(gte(cardViews.viewedAt, thirtyDaysAgo))
                    .groupBy(cardViews.cardId)
                    .orderBy(desc(count()))
                    .limit(5)
            ]);

            // Fetch card details for recent views and top cards
            const viewCardIds = recentViews.map(v => v.cardId).filter((id): id is number => id !== null);
            const topCardIds = topCardsRaw.map(v => v.cardId).filter((id): id is number => id !== null);
            const allCardIds = Array.from(new Set([...viewCardIds, ...topCardIds]));

            const cardsInfo = allCardIds.length > 0
                ? await db.select({ id: businessCards.id, data: businessCards.data, slug: businessCards.slug }).from(businessCards).where(inArray(businessCards.id, allCardIds))
                : [];

            const enrichedViews = recentViews.map(view => {
                const card = cardsInfo.find(c => c.id === view.cardId);
                const cardName = (card?.data as any)?.fullName || (card?.data as any)?.name || 'Unknown Card';
                return { ...view, cardName };
            });

            const enrichedTopCards = topCardsRaw.map(tc => {
                const card = cardsInfo.find(c => c.id === tc.cardId);
                const cardName = (card?.data as any)?.fullName || (card?.data as any)?.name || 'Unknown Card';
                const slug = card?.slug || '';
                return { ...tc, cardName, slug };
            });

            return res.status(200).json({
                recentUsers,
                recentViews: enrichedViews,
                topCards: enrichedTopCards,
                heatmapData,
                sourceStats,
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

async function handlePushTest(req: VercelRequest, res: VercelResponse) {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    try {
        // 1. Find the card and owner
        const cardRecord = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        if (!cardRecord.length) return res.status(404).json({ error: 'Card not found' });

        const userId = cardRecord[0].userId;
        if (!userId) return res.status(400).json({ error: 'Card has no associated user' });

        // 2. Find all registered devices for this user's cards
        const devices = await db.select({
            pushToken: walletPushRegistrations.pushToken,
            passType: walletPushRegistrations.passTypeIdentifier
        })
            .from(walletPushRegistrations)
            .innerJoin(businessCards, sql`${walletPushRegistrations.serialNumber} = ${businessCards.uid}::text`)
            .where(eq(businessCards.userId, userId as string));

        console.log(`[AdminPush] Found ${devices.length} devices for user ${userId}`);

        // 3. Bump updatedAt so Apple recognizes the pass genuinely changed
        if (devices.length > 0) {
            const pushTokens = devices.map(d => d.pushToken);
            await db.update(walletPushRegistrations)
                .set({ updatedAt: new Date() })
                .where(inArray(walletPushRegistrations.pushToken, pushTokens));
        }

        // 4. Send push for each device sequentially to avoid HTTP/2 socket exhaustion
        const results = [];
        for (const d of devices) {
            try {
                await sendPassPush(d.pushToken, d.passType);
                results.push({ token: d.pushToken, topic: d.passType, status: 'sent' });
            } catch (err: any) {
                results.push({ token: d.pushToken, topic: d.passType, status: 'failed', error: err.message });
            }
        }

        for (const r of results) {
            if (r.status === 'failed') console.error('[AdminPush] Failed:', r);
        }

        return res.status(200).json({
            message: `Identified ${devices.length} registered device(s) for this card.`,
            found: devices.length,
            note: 'Real-time updates require APNs certificates.',
            devices: results
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}
