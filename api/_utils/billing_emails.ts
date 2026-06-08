import { Resend } from 'resend';
import { db } from '../../src/db/index.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_billing_to_not_fail_init');

export async function sendRenewalNotice(customerId: string, amount: number, currency: string, periodEnd: number) {
    const user = await db.select({ email: users.email, tier: users.tier }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    if (!user[0]?.email) return;

    const formattedAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
    const date = new Date(periodEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    console.log(`[Billing] Sending renewal notice to ${user[0].email} for ${formattedAmount}`);

    try {
        await resend.emails.send({
            from: 'Really Simple Billing <billing@reallysimpleapps.com>',
            to: [user[0].email],
            subject: 'Upcoming Renewal Reminder: Your Really Simple Subscription',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 32px;">
                    <h2 style="margin-top: 0;">Subscription Renewal Notice</h2>
                    <p>This is a friendly reminder that your <strong>Really Simple ${user[0].tier.toUpperCase()}</strong> plan will automatically renew on <strong>${date}</strong>.</p>
                    
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0; color: #666; font-size: 14px;">Estimated Charge:</p>
                        <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold;">${formattedAmount}</p>
                    </div>

                    <p>No action is required from you. We will charge your card on file automatically.</p>
                    
                    <div style="margin-top: 32px; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reallysimpleapps.com'}/app/billing" 
                           style="background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            Manage Billing
                        </a>
                    </div>
                </div>
            `
        });
    } catch (err) {
        console.error('Failed to send renewal notice:', err);
    }
}

export async function sendPaymentFailedNotice(customerId: string, amount: number, currency: string) {
    const user = await db.select({ email: users.email }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
    if (!user[0]?.email) return;

    const formattedAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);

    console.log(`[Billing] Sending payment failure notice to ${user[0].email}`);

    try {
        await resend.emails.send({
            from: 'Action Required <billing@reallysimpleapps.com>',
            to: [user[0].email],
            subject: '⚠️ Action Required: Your Payment for Really Simple Failed',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; padding: 32px;">
                    <h2 style="margin-top: 0; color: #dc2626;">Payment Failed</h2>
                    <p>We were unable to process your recent payment of <strong>${formattedAmount}</strong> for your account.</p>
                    
                    <p style="background: #fef2f2; padding: 16px; border-radius: 8px; color: #b91c1c; border-left: 4px solid #dc2626;">
                        <strong>Important:</strong> To prevent your digital cards from being deactivated, please update your payment method today.
                    </p>

                    <div style="margin-top: 32px; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reallysimpleapps.com'}/app/billing" 
                           style="background: #dc2626; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Update Payment Now
                        </a>
                    </div>

                    <p style="margin-top: 32px; color: #666; font-size: 14px; text-align: center;">
                        If you have any questions, simply reply to this email.
                    </p>
                </div>
            `
        });
    } catch (err) {
        console.error('Failed to send payment failure notice:', err);
    }
}
