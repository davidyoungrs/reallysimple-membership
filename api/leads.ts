
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { leads, businessCards, users } from '../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod'; // You mentioned zod in plan, ensure it's installed. If not, use manual validation.
// Assuming zod is available.
import { verifyToken } from '@clerk/backend'; // Verify headers if needed

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
                columns: { id: true, userId: true }
            });

            if (!card) {
                return res.status(404).json({ error: 'Card not found' });
            }

            // 2. Insert Lead
            await db.insert(leads).values({
                cardId: card.id,
                name: body.name,
                email: body.email,
                phone: body.phone,
                jobTitle: body.jobTitle,
                company: body.company,
                note: body.note,
                isRead: false
            });

            return res.status(200).json({ success: true });

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
