import { db } from '../src/db/index.js';
import { cardViews, businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// export const config = {
//     runtime: 'edge',
// };

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!secureEndpoint(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: 'Missing slug' });
        }

        // Find card by slug
        const cards = await db
            .select()
            .from(businessCards)
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (cards.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const cardId = cards[0].id;
        const { source = 'direct' } = req.body;

        // Extract referrer and user agent from headers
        // VercelRequest headers are IncomingHttpHeaders (keys are lowercase)
        const referrer = (req.headers['referer'] || req.headers['referrer']) as string || null;
        const userAgent = req.headers['user-agent'] as string || '';

        // Determine device type from user agent
        let deviceType = 'desktop';
        if (/mobile/i.test(userAgent)) {
            deviceType = 'mobile';
        } else if (/tablet|ipad/i.test(userAgent)) {
            deviceType = 'tablet';
        }

        // Extract geolocation data from Vercel headers
        const city = (req.headers['x-vercel-ip-city'] as string) || null;
        const region = (req.headers['x-vercel-ip-country-region'] as string) || null;
        const country = (req.headers['x-vercel-ip-country'] as string) || null;
        const latitude = (req.headers['x-vercel-ip-latitude'] as string) || null;
        const longitude = (req.headers['x-vercel-ip-longitude'] as string) || null;

        // Handle potentially multiple IPs in x-forwarded-for
        const forwardedFor = req.headers['x-forwarded-for'] as string;
        const ipAddress = (req.headers['x-real-ip'] as string) || (forwardedFor ? forwardedFor.split(',')[0] : null);

        // Insert view record
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

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Error tracking view:', error);
        // Don't fail the request if analytics fails
        return res.status(200).json({ success: false, error: error?.message || 'Unknown error' });
    }
}
