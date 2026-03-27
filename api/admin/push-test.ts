import { db } from '../../src/db/index.js';
import { businessCards, walletPushRegistrations, users } from '../../src/db/schema.js';
import { eq, sql, inArray } from 'drizzle-orm';
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

        // 3. Manually bulk-increment the updatedAt token so Apple recognizes the pass genuinely changed
        if (devices.length > 0) {
            const pushTokens = devices.map(d => d.pushToken);
            await db.update(walletPushRegistrations)
                .set({ updatedAt: new Date() })
                .where(inArray(walletPushRegistrations.pushToken, pushTokens));
        }

        // 4. Send real push for each device sequentially to avoid HTTP/2 socket exhaustion crashes on Vercel
        const results = [];
        for (const d of devices) {
            try {
                await sendPassPush(d.pushToken, d.passType);
                results.push({ token: d.pushToken, topic: d.passType, status: 'sent' });
            } catch (err: any) {
                results.push({ token: d.pushToken, topic: d.passType, status: 'failed', error: err.message });
            }
        }

        console.log(`[AdminPush] Push simulated for ${devices.length} devices.`);

        for (const res of results) {
            if (res.status === 'failed') console.error('[AdminPush] Failed:', res);
        }

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
