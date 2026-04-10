import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import { verifyToken, createClerkClient } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendWelcomeEmail } from './_utils/onboarding.js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        const verifiedToken = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        const clerkUserId = verifiedToken.sub;

        const resource = (req.query.resource as string) || 'profile';

        // --- RESOURCE: Feature Flags (from Clerk publicMetadata) ---
        if (resource === 'features') {
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            const user = await clerkClient.users.getUser(clerkUserId);
            const features = (user.publicMetadata as any)?.features || {};
            return res.status(200).json({
                features: {
                    wallet_access: !!features.wallet_access,
                }
            });
        }

        // --- RESOURCE: Profile ---
        // Fetch user from Clerk to get the definitive email
        const fullClerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = fullClerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();

        if (!email) {
            return res.status(400).json({ error: 'User has no email address in Clerk' });
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
                tier: 'starter',
            } as any).returning();
            user = newUser[0];

            // 🚀 Trigger Welcome Email for New User (Non-blocking)
            sendWelcomeEmail(clerkUserId, email).catch(err => {
                console.error('Failed to trigger welcome email in background:', err);
            });
        } else {
            user = userRecords[0];
            // Fix: If we found user by email but clerkId was missing/wrong, update it
            if (user.clerkId !== clerkUserId || user.email.toLowerCase() !== email) {
                const updatedUser = await db.update(users)
                    .set({
                        clerkId: clerkUserId,
                        email: email
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
