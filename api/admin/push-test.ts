import { db } from '../../src/db/index.js';
import { businessCards, walletPushRegistrations, users } from '../../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendPassPush } from '../_utils/apns.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

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

        // 3. Send real push for each device
        const results = await Promise.all(devices.map(async (d) => {
            try {
                // Manually increment the updatedAt token so Apple's server acknowledges the pass genuinely changed
                await db.update(walletPushRegistrations)
                    .set({ updatedAt: new Date() })
                    .where(eq(walletPushRegistrations.pushToken, d.pushToken));

                await sendPassPush(d.pushToken, d.passType);
                return { token: d.pushToken, topic: d.passType, status: 'sent' };
            } catch (err: any) {
                return { token: d.pushToken, topic: d.passType, status: 'failed', error: err.message };
            }
        }));

        console.log(`[AdminPush] Push simulated for ${devices.length} devices.`);

        return res.status(200).json({
            message: `Identified ${devices.length} registered device(s) for this card.`,
            found: devices.length,
            note: "Real-time updates require APNs certificates. Currently, this endpoint verifies the database lookup logic and logs the push intention to the server console.",
            devices: results
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}
