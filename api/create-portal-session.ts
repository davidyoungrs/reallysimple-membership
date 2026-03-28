import { verifyToken } from '@clerk/backend';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-01-27' as any,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        
        const email = verifiedToken.email ? (verifiedToken.email as string) : '';

        // Get user from our DB
        const userByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const stripeCustomerId = userByEmail[0]?.stripeCustomerId;

        if (!stripeCustomerId) {
            return res.status(404).json({ error: 'No active subscription found. Please subscribe first.' });
        }

        // Authenticate portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${req.headers.origin}/dashboard?portal=success`,
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (error: any) {
        console.error('Portal session error:', error);
        return res.status(500).json({ error: 'Failed to create portal session', details: error.message });
    }
}
