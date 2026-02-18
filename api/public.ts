import { db } from '../src/db/index.js';
import { systemSettings } from '../src/db/schema.js';
import { inArray } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// export const config = {
//     runtime: 'edge', // Only if appropriate.
// };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const resource = req.query.resource as string;

    if (resource === 'status') {
        return await handleSystemStatus(req, res);
    } else {
        return res.status(400).json({ error: 'Invalid resource' });
    }
}

async function handleSystemStatus(req: VercelRequest, res: VercelResponse) {
    try {
        // Fetch only public settings
        const settings = await db.select()
            .from(systemSettings)
            .where(inArray(systemSettings.key, ['maintenance_mode', 'disable_registrations']));

        const status = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value === 'true';
            return acc;
        }, {} as Record<string, boolean>);

        return res.status(200).json(status);
    } catch (error) {
        console.error('System Status API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
