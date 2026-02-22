import { db } from '../../../../../../../src/db/index.js';
import { walletPushRegistrations } from '../../../../../../../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { device_id, pass_type, serial_number } = req.query as { device_id: string, pass_type: string, serial_number: string };
    const auth = req.headers.authorization;

    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();
    const token = auth.replace('ApplePass ', '');
    // Simple check: Apple sends back the authenticationToken we baked into the pass
    if (Buffer.from(token, 'base64').toString() !== serial_number) {
        return res.status(401).end();
    }

    if (req.method === 'POST') {
        const { pushToken } = req.body || {};
        if (!pushToken) return res.status(400).end();

        await db.insert(walletPushRegistrations)
            .values({
                deviceLibraryIdentifier: device_id,
                pushToken,
                passTypeIdentifier: pass_type,
                serialNumber: serial_number,
                updatedAt: new Date()
            })
            .onConflictDoUpdate({
                target: [walletPushRegistrations.deviceLibraryIdentifier, walletPushRegistrations.serialNumber],
                set: { pushToken, updatedAt: new Date() }
            });

        console.log(`[Passbook Web Service] Device ${device_id} registered for pass ${serial_number}`);
        return res.status(201).end();

    } else if (req.method === 'DELETE') {
        await db.delete(walletPushRegistrations).where(and(
            eq(walletPushRegistrations.deviceLibraryIdentifier, device_id),
            eq(walletPushRegistrations.serialNumber, serial_number)
        ));
        console.log(`[Passbook Web Service] Device ${device_id} unregistered for pass ${serial_number}`);
        return res.status(200).end();
    }

    return res.status(405).end();
}
