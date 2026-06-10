import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { db } from '../src/db/index.js';
// import { leads } from '../src/db/schema.js';
import { sanitize } from '../src/utils/sanitization.js';
import { checkRateLimit, validatePayload } from './_utils/security.js';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_contact_to_not_fail_init');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const val = process.env.DATABASE_URL;
        return res.status(200).json({
            keys: Object.keys(process.env).sort(),
            node_env: process.env.NODE_ENV,
            vercel_env: process.env.VERCEL_ENV,
            hasDatabaseUrl: !!val,
            databaseUrlType: typeof val,
            databaseUrlLength: val ? val.length : 0,
            databaseUrlExactValue: val === "" ? "EMPTY_STRING" : (val === undefined ? "UNDEFINED" : (val === null ? "NULL" : "OTHER_VALUE")),
            databaseUrlChars: val ? val.split('').map(c => c.charCodeAt(0)) : []
        });
    }

    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res, { maxBytes: 50 * 1024 })) return; // 50KB limit for contact payload

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, country, website, numCards, message } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Sanitize inputs
        const cleanName = sanitize(name);
        const cleanEmail = sanitize(email);
        const cleanCountry = country ? sanitize(country) : null;
        const cleanWebsite = website ? sanitize(website) : null;
        const cleanMessage = message ? sanitize(message) : null;
        const cleanNumCards = numCards ? parseInt(numCards, 10) : null;

        // Insert into database
        await db.insert(leads).values({
            name: cleanName,
            email: cleanEmail,
            country: cleanCountry,
            website: cleanWebsite,
            numCards: cleanNumCards,
            note: cleanMessage,
            isRead: false
        });

        // Trigger Email Notification
        await sendNotification({
            name: cleanName,
            email: cleanEmail,
            country: cleanCountry,
            website: cleanWebsite,
            numCards: cleanNumCards,
            message: cleanMessage
        });

        return res.status(200).json({ success: true, message: 'Inquiry received successfully' });
    } catch (error: any) {
        console.error('Contact API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

async function sendNotification(data: any) {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.NOTIFY_EMAIL || 'david@reallysimple.io'; // Fallback to your likely email
    
    if (apiKey) {
        try {
            await resend.emails.send({
                from: 'Leads <leads@reallysimpleapps.com>',
                to: [toEmail],
                subject: `🚀 New Lead: ${data.name} (${data.numCards || '?'} cards)`,
                replyTo: data.email,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                        <h2 style="color: #000; font-style: italic; text-transform: uppercase;">New Sales Inquiry</h2>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        
                        <p><strong>Name:</strong> ${data.name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
                        <p><strong>Country:</strong> ${data.country || 'N/A'}</p>
                        <p><strong>Website:</strong> ${data.website || 'N/A'}</p>
                        <p><strong>Cards Required:</strong> ${data.numCards || 'N/A'}</p>
                        
                        <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-top: 20px;">
                            <p style="margin-top: 0; font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase;">Requirements:</p>
                            <p style="margin-bottom: 0;">${data.message || 'No specific requirements mentioned.'}</p>
                        </div>
                        
                        <p style="margin-top: 32px; font-size: 12px; color: #999;">
                            This inquiry was submitted via the pricing page contact form. 
                            You can reply directly to this email to contact the lead.
                        </p>
                    </div>
                `
            });
            console.log('Resend email notification sent');
        } catch (err) {
            console.error('Failed to send Resend email:', err);
        }
    } else {
        console.log('No RESEND_API_KEY configured. Inquiry saved to database only.');
    }
}
