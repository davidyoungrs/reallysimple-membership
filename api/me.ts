import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken, createClerkClient } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureEndpoint } from './_utils/security.js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        const userId = verifiedToken.sub;

        const resource = (req.query.resource as string) || 'profile';

        if (resource === 'features') {
            // Fetch latest user data from Clerk to get metadata
            const user = await clerkClient.users.getUser(userId);

            // Extract feature flags from publicMetadata
            // Default structure: publicMetadata: { features: { wallet_access: true } }
            const features = (user.publicMetadata as any)?.features || {};

            return res.status(200).json({
                features: {
                    wallet_access: !!features.wallet_access,
                    // Add other defaults here
                }
            });
        }

        return res.status(400).json({ error: 'Invalid resource' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
