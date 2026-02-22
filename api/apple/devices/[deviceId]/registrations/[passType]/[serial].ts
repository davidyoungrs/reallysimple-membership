import { db } from '../../../../../../src/db/index.js';
import { walletPushRegistrations } from '../../../../../../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { deviceId, passType, serial } = req.query as { deviceId: string, passType: string, serial: string };
    const auth = req.headers.authorization;

    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();
    const token = auth.replace('ApplePass ', '');
    // Simple check: Apple sends back the authenticationToken we baked into the pass
    if (Buffer.from(token, 'base64').toString() !== serial) {
        return res.status(401).end();
    }

    if (req.method === 'POST') {
        const { pushToken } = req.body || {};
        if (!pushToken) return res.status(400).end();

        await db.insert(walletPushRegistrations)
            .values({
                deviceLibraryIdentifier: deviceId,
                pushToken,
                passTypeIdentifier: passType,
                serialNumber: serial,
                updatedAt: new Date()
            })
            .onConflictDoUpdate({
                target: [walletPushRegistrations.deviceLibraryIdentifier, walletPushRegistrations.serialNumber],
                set: { pushToken, updatedAt: new Date() }
            });

        console.log(`[Passbook Web Service] Device ${deviceId} registered for pass ${serial}`);
        return res.status(201).end();

    } else if (req.method === 'DELETE') {
        await db.delete(walletPushRegistrations).where(and(
            eq(walletPushRegistrations.deviceLibraryIdentifier, deviceId),
            eq(walletPushRegistrations.serialNumber, serial)
        ));
        console.log(`[Passbook Web Service] Device ${deviceId} unregistered for pass ${serial}`);
        return res.status(200).end();
    }

    return res.status(405).end();
}
