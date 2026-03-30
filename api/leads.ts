
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db/index.js';
import { leads, businessCards, users } from '../src/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { verifyToken } from '@clerk/backend';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Validation Schema
const leadSchema = z.object({
    cardId: z.string(), // We receive the Public UID (slug or uid) from frontend
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    note: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST: Submit a Lead (Public)
    if (req.method === 'POST') {
        try {
            const body = leadSchema.parse(req.body);

            // 1. Resolve cardId (UID/Slug) to DB ID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.cardId);

            const card = await db.query.businessCards.findFirst({
                where: (table, { eq, or }) => {
                    if (isUuid) {
                        return or(eq(table.uid, body.cardId), eq(table.slug, body.cardId));
                    }
                    return eq(table.slug, body.cardId);
                },
                columns: { id: true, userId: true, data: true }
            });

            if (!card) {
                return res.status(404).json({ error: 'Card not found' });
            }

            const result = await db.insert(leads).values({
                cardId: card.id,
                name: body.name,
                email: body.email,
                phone: body.phone,
                jobTitle: body.jobTitle,
                company: body.company,
                note: body.note,
                isRead: false
            }).returning();

            console.log('Lead saved successfully. Checking for owner to notify...', { cardId: card.id, userId: card.userId });

            if (card.userId) {
                const owner = await db.query.users.findFirst({
                    where: eq(users.clerkId, card.userId)
                });

                console.log('Owner lookup result:', { 
                    found: !!owner, 
                    email: owner?.email,
                    clerkId: card.userId 
                });

                if (owner?.email) {
                    await sendNotification(owner.email, {
                        ...body,
                        cardName: (card.data as any)?.name || 'Digital Card'
                    });
                } else {
                    console.warn('No email found for card owner. Skipping notification.');
                }
            } else {
                console.warn('Card has no userId associated. Skipping notification.');
            }

            return res.status(200).json({ success: true, leadId: result[0]?.id });

        } catch (error: any) {
            console.error('Lead submission error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            return res.status(500).json({ error: 'Internal Server Error', details: error?.message });
        }
    }

    // GET: List Leads (Protected)
    if (req.method === 'GET') {
        try {
            // Auth Check
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const token = authHeader.split(' ')[1];

            let userId: string;
            try {
                const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
                userId = verified.sub;
            } catch (e) {
                return res.status(401).json({ error: 'Invalid Token' });
            }

            // Fetch leads for all cards owned by user
            // 1. Get all Card IDs for user
            const userCards = await db.query.businessCards.findMany({
                where: eq(businessCards.userId, userId),
                columns: { id: true, uid: true, slug: true, data: true } // Need data for Card Name?
            });

            if (userCards.length === 0) {
                return res.status(200).json({ leads: [] });
            }

            const cardIds = userCards.map(c => c.id);

            // 2. Fetch Leads
            const userLeads = await db.query.leads.findMany({
                where: (table, { inArray }) => inArray(table.cardId, cardIds),
                orderBy: desc(leads.submittedAt),
                // Join or just fetch? 
                // We can enrich with Card Name in memory or via join if Drizzle supports it easily here.
            });

            // Flatten/Format result
            const result = userLeads.map(l => {
                const card = userCards.find(c => c.id === l.cardId);
                const cardName = (card?.data as any)?.name || 'Unknown Card';
                return {
                    ...l,
                    cardName,
                    cardSlug: card?.slug || card?.uid
                };
            });

            // CSV Export?
            if (req.query.format === 'csv') {
                // Generate CSV
                const csvHeader = 'Name,Email,Phone,Job Title,Company,Note,Card,Date\n';
                const csvRows = result.map(l => {
                    const date = l.submittedAt ? new Date(l.submittedAt).toISOString() : '';
                    return `"${l.name}","${l.email}","${l.phone || ''}","${l.jobTitle || ''}","${l.company || ''}","${l.note || ''}","${l.cardName}","${date}"`;
                }).join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
                return res.status(200).send(csvHeader + csvRows);
            }

            return res.status(200).json({ leads: result });

        } catch (error) {
            console.error('Fetch leads error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}

async function sendNotification(toEmail: string, data: any) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is not configured in environment variables.');
        return;
    }

    console.log('Attempting to send email to:', toEmail);

    try {
        const { data: resData, error: resError } = await resend.emails.send({
            from: 'Really Simple Leads <leads@reallysimpleapps.com>',
            to: [toEmail],
            subject: `🚀 New Lead Captured: ${data.name}`,
            replyTo: data.email,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #000; font-style: italic; text-transform: uppercase;">You've got a new lead!</h2>
                    <p style="color: #666;">Someone just connected with you via your <strong>${data.cardName}</strong>.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <p><strong>Name:</strong> ${data.name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
                    ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
                    ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
                    ${data.jobTitle ? `<p><strong>Job Title:</strong> ${data.jobTitle}</p>` : ''}
                    
                    ${data.note ? `
                    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin-top: 0; font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase;">Message:</p>
                        <p style="margin-bottom: 0;">${data.note}</p>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 32px; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reallysimple.io'}/app/leads" 
                           style="background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            View all leads in Dashboard
                        </a>
                    </div>
                </div>
            `
        });

        if (resError) {
            console.error('Resend API Error details:', resError);
        } else {
            console.log('Resend email sent successfully! ID:', resData?.id);
        }
    } catch (err) {
        console.error('Generic error in sendNotification function:', err);
    }
}
