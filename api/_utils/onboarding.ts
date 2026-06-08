import { Resend } from 'resend';
import { db } from '../../src/db/index.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_onboarding_to_not_fail_init');

export async function sendWelcomeEmail(clerkUserId: string, email: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is not configured. Skipping welcome email.');
        return;
    }

    console.log('Preparing welcome email for:', email);

    try {
        const { data, error } = await resend.emails.send({
            from: 'Really Simple <welcome@reallysimpleapps.com>',
            to: [email],
            subject: 'Welcome to Really Simple! 🚀',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.025em;">Welcome to Really Simple</h1>
                        <p style="font-size: 18px; color: #666;">The last digital business card you'll ever need.</p>
                    </div>

                    <div style="background: #f9f9f9; border-radius: 24px; padding: 32px; margin-bottom: 32px;">
                        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Ready to grow your network?</h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #444; margin-bottom: 24px;">
                            We're excited to have you on board! Really Simple is designed to help you share your contact info, social links, and business details with a single tap or scan.
                        </p>
                        
                        <div style="display: grid; gap: 16px;">
                            <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #eee;">
                                <strong style="display: block; margin-bottom: 4px;">🎴 Create Your First Card</strong>
                                <span style="font-size: 14px; color: #666;">Customize your design, add social links, and choose your unique slug.</span>
                            </div>
                            <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #eee; margin-top: 12px;">
                                <strong style="display: block; margin-bottom: 4px;">📱 Add to Wallet</strong>
                                <span style="font-size: 14px; color: #666;">Download your card to Apple or Google Wallet for instant sharing offline.</span>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reallysimpleapps.com'}/app" 
                           style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; transition: all 0.2s ease;">
                            Go to Dashboard
                        </a>
                    </div>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">

                    <div style="text-align: center; font-size: 14px; color: #999;">
                        <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} Really Simple. All rights reserved.</p>
                        <p>You received this email because you signed up for Really Simple.</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Failed to send welcome email via Resend:', error);
        } else {
            console.log('Welcome email sent successfully! ID:', data?.id);
            // Update the user record to mark welcome email as sent
            await db.update(users)
                .set({ welcomeEmailSent: true })
                .where(eq(users.clerkId, clerkUserId));
        }

    } catch (err) {
        console.error('Error in sendWelcomeEmail utility:', err);
    }
}
