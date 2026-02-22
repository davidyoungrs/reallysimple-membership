import { db } from '../../../../../src/db/index.js';
import { businessCards } from '../../../../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { serial } = req.query as { serial: string };
    const auth = req.headers.authorization;

    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();

    const cardResults = await db.select().from(businessCards).where(eq(businessCards.uid, serial)).limit(1);
    if (cardResults.length === 0) return res.status(404).end();

    const slug = cardResults[0].slug;
    return res.redirect(`/api/passes?type=apple&slug=${slug}`);
}
