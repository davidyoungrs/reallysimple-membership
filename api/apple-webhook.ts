import { db } from '../../src/db/index.js';
import { walletPushRegistrations, businessCards } from '../../src/db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Apple passes all requests to /api/v1/... which we rewrite to /api/apple-webhook?path=...
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const fullPath = req.query.path as string || '';
    const parts = fullPath.split('/').filter(Boolean);

    // Endpoint 1: GET /devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
    if (req.method === 'GET' && parts[0] === 'devices' && parts[2] === 'registrations' && parts.length === 4) {
        const deviceId = parts[1];
        const passType = parts[3];
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
            serialNumbers: registrations.map((r) => r.serialNumber)
        });
    }

    // Endpoint 2: GET /passes/{passTypeIdentifier}/{serialNumber}
    if (req.method === 'GET' && parts[0] === 'passes' && parts.length === 3) {
        const serial = parts[2];
        const auth = req.headers.authorization;
        if (!auth?.startsWith('ApplePass ')) return res.status(401).end();

        const cardResults = await db.select().from(businessCards).where(eq(businessCards.uid, serial)).limit(1);
        if (cardResults.length === 0) return res.status(404).end();

        return res.redirect(`/api/passes?type=apple&slug=${cardResults[0].slug}`);
    }

    // Endpoint 3: POST or DELETE /devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
    if ((req.method === 'POST' || req.method === 'DELETE') && parts[0] === 'devices' && parts[2] === 'registrations' && parts.length === 5) {
        const deviceId = parts[1];
        const passType = parts[3];
        const serial = parts[4];

        const auth = req.headers.authorization;
        if (!auth?.startsWith('ApplePass ')) return res.status(401).end();
        const token = auth.replace('ApplePass ', '');
        if (Buffer.from(token, 'base64').toString() !== serial) return res.status(401).end();

        if (req.method === 'POST') {
            const { pushToken } = req.body || {};
            if (!pushToken) return res.status(400).end();

            await db.insert(walletPushRegistrations).values({
                deviceLibraryIdentifier: deviceId, pushToken, passTypeIdentifier: passType, serialNumber: serial, updatedAt: new Date()
            }).onConflictDoUpdate({
                target: [walletPushRegistrations.deviceLibraryIdentifier, walletPushRegistrations.serialNumber],
                set: { pushToken, updatedAt: new Date() }
            });
            console.log(`[Passbook Web Service] Device ${deviceId} registered for pass ${serial}`);
            return res.status(201).end();
        } else {
            await db.delete(walletPushRegistrations).where(and(eq(walletPushRegistrations.deviceLibraryIdentifier, deviceId), eq(walletPushRegistrations.serialNumber, serial)));
            console.log(`[Passbook Web Service] Device ${deviceId} unregistered for pass ${serial}`);
            return res.status(200).end();
        }
    }

    console.warn(`[Passbook Web Service] 405 Method Not Allowed - Method: ${req.method} Path: ${fullPath}`);
    return res.status(405).end();
}
