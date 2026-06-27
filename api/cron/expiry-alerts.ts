import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/db/index.js';
import { memberships, clubs } from '../../src/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { sendExpiryAlert } from '../_utils/membership_emails.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Protect against external callers — Vercel injects this header automatically on cron triggers
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('[Cron] Starting expiry alerts check...');

        // Calculate the date exactly 30 days from now
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 30);
        
        // We want to match any expiry that falls on this exact day (ignoring time)
        const targetStart = new Date(targetDate);
        targetStart.setHours(0, 0, 0, 0);
        
        const targetEnd = new Date(targetDate);
        targetEnd.setHours(23, 59, 59, 999);

        // Find all active memberships that expire exactly 30 days from now
        const expiringMemberships = await db.select({
            email: memberships.memberEmail,
            name: memberships.memberName,
            slug: memberships.slug,
            expiresAt: memberships.expiresAt,
            clubName: clubs.name,
            clubSlug: clubs.slug
        })
        .from(memberships)
        .innerJoin(clubs, eq(memberships.clubId, clubs.id))
        .where(
            and(
                eq(memberships.status, 'active'),
                sql`${memberships.expiresAt} >= ${targetStart}`,
                sql`${memberships.expiresAt} <= ${targetEnd}`
            )
        );

        console.log(`[Cron] Found ${expiringMemberships.length} memberships expiring in 30 days.`);

        let sentCount = 0;
        for (const m of expiringMemberships) {
            try {
                if (m.email && m.expiresAt) {
                    await sendExpiryAlert(m.email, m.name, m.clubName, m.clubSlug, m.slug, m.expiresAt);
                    sentCount++;
                }
            } catch (err) {
                console.error(`[Cron] Failed to send alert to ${m.email}:`, err);
            }
        }

        return res.status(200).json({ success: true, count: sentCount });

    } catch (error: any) {
        console.error('[Cron] Expiry alerts job failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
