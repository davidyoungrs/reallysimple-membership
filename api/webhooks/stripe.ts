import { db } from '../../src/db/index.js';
import { users, walletPushRegistrations, businessCards } from '../../src/db/schema.js';
import { eq, sql, or } from 'drizzle-orm';
import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendPassPush } from '../_utils/apns.js';
import { sendRenewalNotice, sendPaymentFailedNotice } from '../_utils/billing_emails.js';
import { createClerkClient } from '@clerk/backend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {} as any);
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Vercel config to disable body parsing for raw body access
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to read the raw body from the request stream
async function buffer(readable: ReadableStream | any) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

// Mapping of Price IDs to Tiers
// These should ideally be in env vars, but we'll define a map for logic
// Mapping of Price IDs to Tiers
// We'll look for both VITE_ prefixed and standard STRIPE_ prefixed env vars
const getPriceMap = () => {
    const map: Record<string, string> = {};
    const prefixes = ['', 'VITE_', 'A-VITE_'];
    const tiers = ['PRO_MONTHLY', 'PRO_YEARLY', 'PLUS_MONTHLY', 'PLUS_YEARLY', 'BUSINESS_MONTHLY'];
    
    for (const prefix of prefixes) {
        for (const tier of tiers) {
            const key = `${prefix}STRIPE_PRICE_${tier}`;
            const val = process.env[key];
            if (val) {
                const tierName = tier.toLowerCase().startsWith('pro') ? 'pro' : 
                               tier.toLowerCase().startsWith('plus') ? 'pro_plus' : 'business';
                map[val] = tierName;
            }
        }
    }
    return map;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (!sig) throw new Error('No stripe-signature header');
        if (!endpointSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET env var');

        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig as string, endpointSecret);
    } catch (err: any) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

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
            case 'invoice.upcoming': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.customer) {
                    await sendRenewalNotice(
                        invoice.customer as string,
                        invoice.amount_due,
                        invoice.currency,
                        invoice.next_payment_attempt || Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60)
                    );
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.customer) {
                    await sendPaymentFailedNotice(
                        invoice.customer as string,
                        invoice.amount_due,
                        invoice.currency
                    );
                }
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
    const clerkId = session.metadata?.userId;

    console.log(`[Stripe] Session completed for customer ${customerId}, metadata clerkId: ${clerkId}`);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    
    const priceMap = getPriceMap();
    const tier = priceMap[priceId] || 'pro'; 
    
    console.log(`[Stripe] Found price ${priceId} -> Assigned tier: ${tier}`);

    // Safely parse the period end date - Stripe SDK can be inconsistent between camelCase/snake_case
    const rawPeriodEnd = (subscription as any).current_period_end || (subscription as any).currentPeriodEnd;
    let periodEnd: Date | null = null;
    
    if (rawPeriodEnd && !isNaN(Number(rawPeriodEnd))) {
        periodEnd = new Date(Number(rawPeriodEnd) * 1000);
    }

    // Update user: Try stripeCustomerId first, fallback to clerkId from metadata
    const whereClause = clerkId 
        ? or(eq(users.stripeCustomerId, customerId), eq(users.clerkId, clerkId))
        : eq(users.stripeCustomerId, customerId);

    const updateResult = await db.update(users)
        .set({
            subscriptionStatus: subscription.status,
            tier: tier,
            stripeCustomerId: customerId,
            currentPeriodEnd: periodEnd
        } as any)
        .where(whereClause);

    console.log(`[Stripe] Database update result: ${JSON.stringify(updateResult)}`);
    console.log(`[Stripe] Provisioned tier ${tier} for customer ${customerId}`);

    let targetClerkId = clerkId;
    if (!targetClerkId) {
        const userRecord = await db.select({ clerkId: users.clerkId }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
        targetClerkId = userRecord[0]?.clerkId as string | undefined;
    }

    // Sync to Clerk and trigger Apple Wallet refresh if we found the user
    if (targetClerkId) {
        await syncUserToClerk(targetClerkId, tier, subscription.status);
        await notifyDevices(targetClerkId);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;
    
    const priceMap = getPriceMap();
    const tier = priceMap[priceId] || 'pro';

    const rawPeriodEnd = (subscription as any).current_period_end || (subscription as any).currentPeriodEnd;
    let periodEnd: Date | null = null;
    
    if (rawPeriodEnd && !isNaN(Number(rawPeriodEnd))) {
        periodEnd = new Date(Number(rawPeriodEnd) * 1000);
    }

    await db.update(users)
        .set({
            subscriptionStatus: subscription.status,
            tier: tier,
            currentPeriodEnd: periodEnd
        } as any)
        .where(eq(users.stripeCustomerId, customerId));

    const user = await db.select({ clerkId: users.clerkId }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    // Always notify devices on any update to sync status
    if (user[0]?.clerkId) {
        await syncUserToClerk(user[0].clerkId, tier, subscription.status);
        await notifyDevices(user[0].clerkId);
    }
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

    const user = await db.select({ clerkId: users.clerkId }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    if (user[0]?.clerkId) {
        await syncUserToClerk(user[0].clerkId, 'starter', 'canceled');
        await notifyDevices(user[0].clerkId);
    }

    console.log(`[Stripe] Subscription deleted for customer ${customerId}. Reset to starter.`);
}

async function syncUserToClerk(clerkId: string, tier: string, status: string) {
    try {
        console.log(`[Clerk Sync] Updating user ${clerkId} with tier ${tier}...`);
        await clerkClient.users.updateUserMetadata(clerkId, {
            publicMetadata: {
                tier: tier,
                subscriptionStatus: status,
                // Also add a flag for legacy systems checking features
                features: {
                    wallet_access: tier !== 'starter'
                }
            }
        });
        console.log(`[Clerk Sync] Successfully updated Clerk for ${clerkId}`);
    } catch (err) {
        console.error(`[Clerk Sync] Failed to update Clerk for ${clerkId}:`, err);
    }
}

async function notifyDevices(userId: string) {
    try {
        // 1. Find all registered devices for this user's cards
        const devices = await db.select({
            pushToken: walletPushRegistrations.pushToken,
            passType: walletPushRegistrations.passTypeIdentifier
        })
            .from(walletPushRegistrations)
            .innerJoin(businessCards, sql`${walletPushRegistrations.serialNumber} = ${businessCards.uid}::text`)
            .where(eq(businessCards.userId, userId));

        if (devices.length === 0) return;

        console.log(`[Push] Triggering updates for ${devices.length} devices...`);

        // 2. Group by pass type and send push
        // Note: Real implementation requires APNs certificates and HTTP/2 requests.
        // We'll log the intention here for the user to configure.
        for (const device of devices) {
            try {
                await sendPassPush(device.pushToken, device.passType);
                console.log(`[Push] Real APNs push sent to ${device.pushToken.substring(0, 8)}...`);
            } catch (pushErr) {
                console.error(`[Push] Failed to send push to ${device.pushToken.substring(0, 8)}:`, pushErr);
            }
        }
    } catch (err) {
        console.error('Failed to notify devices:', err);
    }
}
