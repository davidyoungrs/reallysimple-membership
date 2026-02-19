import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
        const email = verifiedToken.email as string;

        // Fetch user from DB
        let userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
        let user;

        if (userRecords.length === 0) {
            // Auto-provision user in DB if missing
            const newUser = await db.insert(users).values({
                email,
                clerkId: clerkUserId,
                tier: 'starter',
            } as any).returning();
            user = newUser[0];
        } else {
            user = userRecords[0];
            // Update clerkId if it's missing or different (e.g. email match but first time with clerkId)
            if (user.clerkId !== clerkUserId) {
                const updatedUser = await db.update(users)
                    .set({ clerkId: clerkUserId })
                    .where(eq(users.id, user.id))
                    .returning();
                user = updatedUser[0];
            }
        }

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
