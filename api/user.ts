import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { checkRateLimit, validatePayload } from './_utils/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let clerkUserId = 'usr_admin';
        let email = 'admin@reallysimpleapps.com';

        const authBypass = process.env.CLERK_BYPASS_AUTH === 'true';

        if (!authBypass) {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
            }
            const token = authHeader.split(' ')[1];
            try {
                const verifiedToken = await verifyToken(token, {
                    secretKey: process.env.CLERK_SECRET_KEY,
                });
                clerkUserId = verifiedToken.sub;

                // Fetch Clerk user details to get email
                const { createClerkClient } = await import('@clerk/backend');
                const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                const clerkUser = await clerk.users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
            } catch (err) {
                console.error('[Clerk-Auth-User] Verification failed:', err);
                return res.status(401).json({ error: 'Unauthorized: Invalid token' });
            }
        }

        const resource = (req.query.resource as string) || 'profile';

        // --- RESOURCE: Feature Flags ---
        if (resource === 'features') {
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            return res.status(200).json({
                features: {
                    wallet_access: true,
                }
            });
        }

        // Fetch user from DB - Prioritize clerkId, fallback to email
        let userRecords = await db.select().from(users)
            .where(or(
                eq(users.clerkId, clerkUserId),
                eq(sql`LOWER(${users.email})`, email)
            ))
            .limit(1);

        let user;

        if (userRecords.length === 0) {
            // Auto-provision user in DB if missing
            const newUser = await db.insert(users).values({
                email,
                clerkId: clerkUserId,
                tier: 'business',
                subscriptionStatus: 'active',
            } as any).returning();
            user = newUser[0];
        } else {
            user = userRecords[0];
            // Force user to be business tier
            if (user.tier !== 'business' || user.subscriptionStatus !== 'active') {
                const updatedUser = await db.update(users)
                    .set({
                        tier: 'business',
                        subscriptionStatus: 'active'
                    })
                    .where(eq(users.id, user.id))
                    .returning();
                user = updatedUser[0];
            }
        }

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                subscriptionStatus: user.subscriptionStatus,
                currentPeriodEnd: user.currentPeriodEnd,
            }
        });

    } catch (error: any) {
        console.error('User API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
