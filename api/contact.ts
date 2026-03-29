import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db/index.js';
import { leads } from '../src/db/schema.js';
import { sanitize } from '../src/utils/sanitization.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        // Trigger Notification (Placeholder)
        // You can add SLACK_WEBHOOK_URL or RESEND_API_KEY to your environment variables
        await sendNotification({
            name: cleanName,
            email: cleanEmail,
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
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    
    if (slackWebhook) {
        try {
            await fetch(slackWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚀 *New Sales Inquiry Received!*\n\n*Name:* ${data.name}\n*Email:* ${data.email}\n*Cards Required:* ${data.numCards || 'N/A'}\n*Message:* ${data.message || 'No message'}`
                })
            });
            console.log('Slack notification sent');
        } catch (err) {
            console.error('Failed to send Slack notification:', err);
        }
    } else {
        console.log('No notification service configured. Inquiry saved to database.');
    }
}
