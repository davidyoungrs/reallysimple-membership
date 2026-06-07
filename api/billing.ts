import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq, or } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, validatePayload } from './_utils/security.js';

let stripeInstance: Stripe | null = null;

function getStripe() {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is missing in the environment');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            // Use account default API version
        } as any);
    }
    return stripeInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res)) return;

    // --- SPECIAL PUBLIC ACTION: Get Exchange Rates (GET or POST) ---
    const action = req.query.action || req.body?.action;
    
    if (action === 'get-rates') {
        try {
            // Priority 1: Frankfurter (Fast, public, reliable for basic rates)
            try {
                const response = await fetch('https://api.frankfurter.app/latest?base=GBP');
                if (response.ok) {
                    const data = await response.json();
                    if (data.rates) {
                        return res.status(200).json({ rates: data.rates });
                    }
                }
            } catch (frankError: any) {
                console.warn('Frankfurter FX fetch failed, falling back to Stripe:', frankError.message);
            }

            // Priority 2: Stripe (Slower, account-dependent)
            try {
                const exchangeRates = await getStripe().exchangeRates.retrieve('gbp');
                if (exchangeRates.rates) {
                    return res.status(200).json({ rates: exchangeRates.rates });
                }
            } catch (stripeError: any) {
                console.warn('Stripe FX fetch failed:', stripeError.message);
            }
            
            throw new Error('All FX rate sources exhausted');
        } catch (error: any) {
            console.error('FX Rates error:', error);
            return res.status(500).json({ error: 'Failed to fetch rates', details: error.message });
        }
    }

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
        const userId = verifiedToken.sub;
        const email = verifiedToken.email ? (verifiedToken.email as string) : '';

        // --- ACTION: Create Checkout Session ---
        if (action === 'checkout') {
            const { priceId, successUrl, cancelUrl, currency } = req.body;

            console.log(`[Billing] Action: checkout, PriceID: ${priceId}, ClerkId: ${userId}`);

            if (!priceId) {
                return res.status(400).json({ error: 'Missing priceId' });
            }

            // Look up user by clerkId FIRST (works regardless of which email the user paid with)
            // Fall back to email only as a secondary match
            let existingUser = await db.select().from(users)
                .where(or(eq(users.clerkId, userId), eq(users.email, email)))
                .limit(1);

            let stripeCustomerId = existingUser[0]?.stripeCustomerId;

            if (!stripeCustomerId) {
                // Create a Stripe customer, tagging with clerkId so the webhook can always find them
                const customer = await getStripe().customers.create({
                    email: email,
                    metadata: { clerkId: userId },
                });
                stripeCustomerId = customer.id;
            }

            // Always upsert the user record, ensuring clerkId + stripeCustomerId are both set
            if (existingUser.length > 0) {
                await db.update(users)
                    .set({ stripeCustomerId, clerkId: userId } as any)
                    .where(eq(users.id, existingUser[0].id));
            } else {
                await db.insert(users).values({
                    email,
                    stripeCustomerId,
                    clerkId: userId,
                    tier: 'starter',
                } as any);
            }

            // session.metadata.userId (clerkId) is the webhook's source of truth —
            // it works even if the user pays with Apple Pay using a different email
            const session = await getStripe().checkout.sessions.create({
                customer: stripeCustomerId,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                currency: currency || 'gbp',
                success_url: successUrl || `${req.headers.origin}/dashboard?checkout=success`,
                cancel_url: cancelUrl || `${req.headers.origin}/pricing?checkout=cancel`,
                metadata: { userId }, // clerkId — webhook uses this to find the right account
            });

            return res.status(200).json({ url: session.url });
        }

        // --- ACTION: Create Customer Portal Session ---
        if (action === 'portal') {
            const existingUser = await db.select().from(users)
                .where(or(eq(users.clerkId, userId), eq(users.email, email)))
                .limit(1);
            
            const stripeCustomerId = existingUser[0]?.stripeCustomerId;

            if (!stripeCustomerId) {
                return res.status(404).json({ error: 'No active subscription found. Please subscribe first.' });
            }

            const portalSession = await getStripe().billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: `${req.headers.origin}/dashboard?portal=success`,
            });

            return res.status(200).json({ url: portalSession.url });
        }

        // --- ACTION: Cancel Subscription ---
        if (action === 'cancel') {
            const existingUser = await db.select().from(users)
                .where(or(eq(users.clerkId, userId), eq(users.email, email)))
                .limit(1);
            
            const stripeCustomerId = existingUser[0]?.stripeCustomerId;

            if (!stripeCustomerId) {
                return res.status(404).json({ error: 'No active subscription found.' });
            }

            // Find their active or past_due subscriptions
            const subscriptions = await getStripe().subscriptions.list({
                customer: stripeCustomerId,
                limit: 1,
            });

            const activeSub = subscriptions.data.find(sub => sub.status === 'active' || sub.status === 'past_due' || sub.status === 'trialing');

            if (!activeSub) {
                return res.status(404).json({ error: 'No active subscription to cancel.' });
            }

            // Cancel immediately
            await getStripe().subscriptions.cancel(activeSub.id);

            return res.status(200).json({ success: true, message: 'Subscription successfully cancelled.' });
        }

        return res.status(400).json({ error: 'Invalid action.' });

    } catch (error: any) {
        console.error('Billing API error:', error);
        return res.status(500).json({ error: 'Billing operation failed', details: error.message });
    }
}
