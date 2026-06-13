import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_billing_to_not_fail_init');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reallysimple-membership.vercel.app';

export async function sendWelcomeEmail(email: string, name: string, clubName: string, clubSlug: string, memberSlug: string) {
    if (!email) return;

    const senderEmail = `${clubName} <${clubSlug}@reallysimpleapps.com>`;
    
    const webLink = `${APP_URL}/membership/${memberSlug}`;
    const appleLink = `${APP_URL}/api/passes?resource=membership&type=apple&slug=${memberSlug}`;
    const googleLink = `${APP_URL}/api/passes?resource=membership&type=google&slug=${memberSlug}`;

    console.log(`[Email] Sending welcome email to ${email} for club ${clubName}`);

    try {
        await resend.emails.send({
            from: senderEmail,
            to: [email],
            subject: `Your ${clubName} Membership Card is Ready`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 32px;">
                    <h2 style="margin-top: 0;">Welcome, ${name}!</h2>
                    <p>Your official digital membership card for <strong>${clubName}</strong> is ready to be downloaded.</p>
                    
                    <p>You can add this card directly to your phone's digital wallet for easy access at any time.</p>

                    <div style="margin: 32px 0; text-align: center;">
                        <a href="${appleLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 12px;">
                            Add to Apple Wallet
                        </a>
                        <br/>
                        <a href="${googleLink}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            Save to Google Pay
                        </a>
                    </div>

                    <p style="margin-top: 32px; color: #666; font-size: 14px;">
                        Or you can <a href="${webLink}" style="color: #4f46e5;">view your card online here</a>.
                    </p>
                </div>
            `
        });
    } catch (err) {
        console.error(`[Email] Failed to send welcome email to ${email}:`, err);
    }
}

export async function sendExpiryAlert(email: string, name: string, clubName: string, clubSlug: string, memberSlug: string, expiryDate: Date) {
    if (!email) return;

    const senderEmail = `${clubName} <${clubSlug}@reallysimpleapps.com>`;
    const dateStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const webLink = `${APP_URL}/membership/${memberSlug}`;

    console.log(`[Email] Sending expiry alert to ${email} for club ${clubName}`);

    try {
        await resend.emails.send({
            from: senderEmail,
            to: [email],
            subject: `Action Required: Your ${clubName} Membership Expires Soon`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; padding: 32px;">
                    <h2 style="margin-top: 0; color: #dc2626;">Membership Expiring Soon</h2>
                    <p>Hi ${name},</p>
                    <p>This is a friendly reminder that your digital membership card for <strong>${clubName}</strong> is set to expire on <strong>${dateStr}</strong>.</p>
                    
                    <p style="background: #fef2f2; padding: 16px; border-radius: 8px; color: #b91c1c; border-left: 4px solid #dc2626;">
                        <strong>Important:</strong> Please ensure your membership is renewed before this date to prevent your digital card from being deactivated on your phone.
                    </p>

                    <div style="margin-top: 32px; text-align: center;">
                        <a href="${webLink}" style="background: #dc2626; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            View Membership Status
                        </a>
                    </div>

                    <p style="margin-top: 32px; color: #666; font-size: 14px; text-align: center;">
                        If you have already renewed, please ignore this email.
                    </p>
                </div>
            `
        });
    } catch (err) {
        console.error(`[Email] Failed to send expiry alert to ${email}:`, err);
    }
}
