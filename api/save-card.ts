import { db } from '../src/db/index.js';
import { businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';
import { sanitize } from '../src/utils/sanitization.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!secureEndpoint(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        const { cardData, cardId, userId } = body;

        if (!cardData) {
            return res.status(400).json({ error: 'Missing card data' });
        }

        // Sanitize sensitive user input
        if (cardData.fullName) cardData.fullName = sanitize(cardData.fullName);
        if (cardData.bio) cardData.bio = sanitize(cardData.bio);
        if (cardData.jobTitle) cardData.jobTitle = sanitize(cardData.jobTitle);
        if (cardData.company) cardData.company = sanitize(cardData.company);

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Get slug from cardData
        let slug = cardData.slug;

        console.log('Saving card with slug:', slug, 'cardId:', cardId, 'userId:', userId);

        // Check slug uniqueness if provided
        if (slug) {
            const existingCard = await db.select()
                .from(businessCards)
                .where(eq(businessCards.slug, slug))
                .limit(1);

            // If slug exists and it's not the current card, reject it
            if (existingCard.length > 0 && existingCard[0].id !== cardId) {
                console.log('Slug already taken by card:', existingCard[0].id);
                return res.status(400).json({
                    error: 'Slug already taken',
                    suggestion: `${slug}-2`
                });
            }
        }

        let result;
        if (cardId) {
            // Update existing card by ID
            result = await db.update(businessCards)
                .set({
                    data: cardData,
                    slug: slug || null,
                    updatedAt: new Date(),
                })
                .where(eq(businessCards.id, cardId))
                .returning();
        } else {
            // Create new card
            result = await db.insert(businessCards)
                .values({
                    userId: userId,
                    data: cardData,
                    slug: slug || null,
                    updatedAt: new Date(),
                })
                .returning();
        }

        return res.status(200).json({ success: true, card: result[0] });

    } catch (error: any) {
        console.error('Error saving card:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
