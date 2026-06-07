import { db } from '../src/db/index.js';
import { walletPushRegistrations, businessCards } from '../src/db/schema.js';
import { eq, sql, inArray } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import { sendPassPush } from './_utils/apns.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, validatePayload } from './_utils/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res)) return;

    if (req.method !== 'POST') {
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
        const userId = verifiedToken.sub; // clerkId
        const { cardId } = req.body || {};

        // If a specific cardId is provided, we can sync just that card.
        // Otherwise, sync all cards for the user.
        let cardFilter = eq(businessCards.userId, userId);
        if (cardId) {
            // Need to still verify the card belongs to the user
            const targetCard = await db.select({ id: businessCards.id }).from(businessCards).where(eq(businessCards.id, cardId)).limit(1);
            if (!targetCard.length) return res.status(404).json({ error: 'Card not found' });
            cardFilter = sql`${businessCards.id} = ${cardId} AND ${businessCards.userId} = ${userId}`;
        }

        // 1. Find all registered devices for this user's targeted cards
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

        // 2. Bump the updatedAt timestamp for these registrations.
        // This is CRITICAL because when APNs wakes the wallet up, it will check the `last-modified` header.
        // If we don't bump this, the Apple Server will think the pass is exactly the same and ignore it!
        const registrationIds = devices.map(d => d.id);
        
        // Build an IN clause for Drizzle
        if (registrationIds.length > 0) {
            await db.update(walletPushRegistrations)
                .set({ updatedAt: new Date() })
                .where(inArray(walletPushRegistrations.id, registrationIds));
        }

        // 3. Send APNs Push Notification to all found devices
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
