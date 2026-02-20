import { db } from '../../src/db/index.js';
import { businessCards, walletPushRegistrations, users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
            .innerJoin(businessCards, eq(walletPushRegistrations.serialNumber, businessCards.uid))
            .where(eq(businessCards.userId, userId as string));

        console.log(`[AdminPush] Found ${devices.length} devices for user ${userId}`);

        // 3. Log the "Push" (This represents where the APNs call happens)
        // Since we are in a test/dev environment, we just log it.
        const results = devices.map(d => ({
            token: d.pushToken,
            topic: d.passType,
            status: 'sent (mock)'
        }));

        console.log(`[AdminPush] Push simulated for ${devices.length} devices.`);

        return res.status(200).json({
            message: `Push triggered for ${devices.length} devices.`,
            devices: results
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}
