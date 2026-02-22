import { db } from '../../../../../../src/db/index.js';
import { walletPushRegistrations } from '../../../../../../src/db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { deviceId, passType } = req.query as { deviceId: string, passType: string };
    const since = req.query.passesUpdatedSince as string;

    const registrations = await db.select({ serialNumber: walletPushRegistrations.serialNumber })
        .from(walletPushRegistrations)
        .where(and(
            eq(walletPushRegistrations.deviceLibraryIdentifier, deviceId),
            eq(walletPushRegistrations.passTypeIdentifier, passType),
            since ? gte(walletPushRegistrations.updatedAt, new Date(since)) : undefined
        ));

    if (registrations.length === 0) return res.status(204).end();

    return res.status(200).json({
        lastUpdated: new Date().toISOString(),
        serialNumbers: registrations.map((r: { serialNumber: string }) => r.serialNumber)
    });
}
