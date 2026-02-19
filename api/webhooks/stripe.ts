import { db } from '../../src/db/index.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-01-27' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Mapping of Price IDs to Tiers
// These should ideally be in env vars, but we'll define a map for logic
const PRICE_ID_TO_TIER: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY as string]: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY as string]: 'pro',
    [process.env.STRIPE_PRICE_PLUS_MONTHLY as string]: 'pro_plus',
    [process.env.STRIPE_PRICE_PLUS_YEARLY as string]: 'pro_plus',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY as string]: 'business',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Vercel gives us access to raw body for webhook verification
        // But for @vercel/node, we might need to handle buffer manually if bodyParser is on.
        // Usually checkout session creates a buffer.
        // We'll use req.body if it's not already parsed, or use raw-body package if needed.
        // Assuming Vercel handles raw body in a way compatible with stripe.webhooks.constructEvent.

        // IMPORTANT: We need the raw body for signature verification
        const rawBody = (req as any).rawBody || req.body;
        event = stripe.webhooks.constructEvent(rawBody, sig as string, endpointSecret as string);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleSubscriptionCreated(session);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const tier = PRICE_ID_TO_TIER[priceId] || 'starter';

    await db.update(users)
        .set({
            subscriptionStatus: subscription.status,
            tier: tier,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
        } as any)
        .where(eq(users.stripeCustomerId, customerId));

    console.log(`[Stripe] Provisioned tier ${tier} for customer ${customerId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;
    const tier = PRICE_ID_TO_TIER[priceId] || 'starter';

    await db.update(users)
        .set({
            subscriptionStatus: subscription.status,
            tier: subscription.status === 'active' ? tier : 'starter',
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
        } as any)
        .where(eq(users.stripeCustomerId, customerId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    await db.update(users)
        .set({
            subscriptionStatus: 'canceled',
            tier: 'starter', // Reset to starter
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
        } as any)
        .where(eq(users.stripeCustomerId, customerId));

    // Trigger Wallet update logic here in a real scenario
    console.log(`[Stripe] Subscription deleted for customer ${customerId}. Reset to starter.`);
}
