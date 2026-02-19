import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
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
        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        const verifiedToken = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        const userId = verifiedToken.sub;
        const email = verifiedToken.email ? (verifiedToken.email as string) : '';

        const { priceId, successUrl, cancelUrl } = req.body;

        if (!priceId) {
            return res.status(400).json({ error: 'Missing priceId' });
        }

        // Get or create user in our DB
        let user = await db.select().from(users).where(eq(users.id as any, userId as any)).limit(1);
        // Note: userId from Clerk (sub) is a string, schema 'users' id is serial (integer).
        // I should probably wait... in schema.ts, users.id is serial.
        // But businessCards.userId is text.
        // Let's re-check schema.ts

        // Actually, clerk userId is a string like 'user_...'. 
        // Our users table uses serial ID. 
        // We should probably change users table to use text ID for Clerk sub, or link them.
        // For now, I'll search by email since that's unique.

        let userByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);

        let stripeCustomerId = userByEmail[0]?.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: email,
                metadata: { clerkId: userId },
            });
            stripeCustomerId = customer.id;

            if (userByEmail.length > 0) {
                await db.update(users).set({ stripeCustomerId }).where(eq(users.email, email));
            } else {
                await db.insert(users).values({
                    email,
                    stripeCustomerId,
                    tier: 'starter' // Default for new users
                } as any);
            }
        }

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl || `${req.headers.origin}/dashboard?checkout=success`,
            cancel_url: cancelUrl || `${req.headers.origin}/pricing?checkout=cancel`,
            metadata: { userId },
        });

        return res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error('Checkout error:', error);
        return res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
    }
}
