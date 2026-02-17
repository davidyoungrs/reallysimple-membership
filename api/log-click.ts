import { db } from '../src/db/index.js';
import { businessCards, cardClicks } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!secureEndpoint(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug, type, targetInfo } = req.body;

        if (!slug || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Find card ID from slug
        const card = await db.select({ id: businessCards.id })
            .from(businessCards)
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (!card.length) {
            console.error(`Card not found for slug: ${slug}`);
            return res.status(404).json({ error: 'Card not found' });
        }

        const cardId = card[0].id;
        const userAgent = req.headers['user-agent'] as string || undefined;

        await db.insert(cardClicks).values({
            cardId,
            type,
            targetInfo,
            userAgent,
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error tracking click:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
