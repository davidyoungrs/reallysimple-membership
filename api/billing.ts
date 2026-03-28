import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let stripeInstance: Stripe | null = null;

function getStripe() {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is missing in the environment');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-01-27' as any,
        });
    }
    return stripeInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- SPECIAL PUBLIC ACTION: Get Exchange Rates (GET or POST) ---
    const action = req.query.action || req.body?.action;
    
    if (action === 'get-rates') {
        try {
            // Try Stripe first
            try {
                const exchangeRates = await getStripe().exchangeRates.retrieve('gbp');
                if (exchangeRates.rates) {
                    return res.status(200).json({ rates: exchangeRates.rates });
                }
            } catch (stripeError: any) {
                console.warn('Stripe FX fetch failed, falling back to Frankfurter:', stripeError.message);
            }

            // Fallback to Frankfurter (Server-side fetch to avoid CSP)
            const response = await fetch('https://api.frankfurter.app/latest?base=GBP');
            if (response.ok) {
                const data = await response.json();
                if (data.rates) {
                    return res.status(200).json({ rates: data.rates });
                }
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

            if (!priceId) {
                return res.status(400).json({ error: 'Missing priceId' });
            }

            let userByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
            let stripeCustomerId = userByEmail[0]?.stripeCustomerId;

            if (!stripeCustomerId) {
                const customer = await getStripe().customers.create({
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
                        tier: 'starter',
                    } as any);
                }
            }

            const session = await getStripe().checkout.sessions.create({
                customer: stripeCustomerId,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                currency: currency || 'gbp',
                success_url: successUrl || `${req.headers.origin}/dashboard?checkout=success`,
                cancel_url: cancelUrl || `${req.headers.origin}/pricing?checkout=cancel`,
                metadata: { userId },
            });

            return res.status(200).json({ url: session.url });
        }

        // --- ACTION: Create Customer Portal Session ---
        if (action === 'portal') {
            const userByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
            const stripeCustomerId = userByEmail[0]?.stripeCustomerId;

            if (!stripeCustomerId) {
                return res.status(404).json({ error: 'No active subscription found. Please subscribe first.' });
            }

            const portalSession = await getStripe().billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: `${req.headers.origin}/dashboard?portal=success`,
            });

            return res.status(200).json({ url: portalSession.url });
        }

        return res.status(400).json({ error: 'Invalid action.' });

    } catch (error: any) {
        console.error('Billing API error:', error);
        return res.status(500).json({ error: 'Billing operation failed', details: error.message });
    }
}
