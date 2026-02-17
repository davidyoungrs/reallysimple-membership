import { db } from '../src/db/index.js';
import { cardViews, businessCards, cardClicks } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!secureEndpoint(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug, source = 'direct', type: actionType, targetInfo, action } = req.body;
        // Support both 'action' (new) and implicit detection or 'type' (old click logic)
        // Actually, let's enforce a discriminated union or just check content.
        // PublicCard will send 'action' = 'view' | 'click'

        const effectiveAction = action || (req.body.type ? 'click' : 'view');

        if (!slug) {
            return res.status(400).json({ error: 'Missing slug' });
        }

        // Common: Get Card ID
        const cards = await db
            .select({ id: businessCards.id })
            .from(businessCards)
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (cards.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }
        const cardId = cards[0].id;

        // User Agent
        const userAgent = req.headers['user-agent'] as string || '';

        if (effectiveAction === 'view') {
            // VIEW LOGIC
            const referrer = (req.headers['referer'] || req.headers['referrer']) as string || null;

            // Determine device type
            let deviceType = 'desktop';
            if (/mobile/i.test(userAgent)) {
                deviceType = 'mobile';
            } else if (/tablet|ipad/i.test(userAgent)) {
                deviceType = 'tablet';
            }

            // Geo (Vercel headers)
            const city = (req.headers['x-vercel-ip-city'] as string) || null;
            const region = (req.headers['x-vercel-ip-country-region'] as string) || null;
            const country = (req.headers['x-vercel-ip-country'] as string) || null;
            const latitude = (req.headers['x-vercel-ip-latitude'] as string) || null;
            const longitude = (req.headers['x-vercel-ip-longitude'] as string) || null;

            // IP
            const forwardedFor = req.headers['x-forwarded-for'] as string;
            const ipAddress = (req.headers['x-real-ip'] as string) || (forwardedFor ? forwardedFor.split(',')[0] : null);

            await db.insert(cardViews).values({
                cardId,
                referrer,
                userAgent,
                city,
                region,
                country,
                latitude,
                longitude,
                ipAddress,
                deviceType,
                source,
            });

        } else if (effectiveAction === 'click') {
            // CLICK LOGIC
            // For clicks, 'type' in body refers to link type (e.g. 'instagram', 'phone')
            // So we need to use that.
            if (!actionType) {
                return res.status(400).json({ error: 'Missing click type' });
            }

            await db.insert(cardClicks).values({
                cardId,
                type: actionType,
                targetInfo,
                userAgent,
            });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Track error:', error);
        // Don't fail the request if analytics fails
        return res.status(200).json({ success: false, error: error?.message || 'Unknown error' });
    }
}
