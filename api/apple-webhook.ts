import { db } from '../src/db/index.js';
import { walletPushRegistrations, businessCards } from '../src/db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApplePass } from './passes.js';

// Apple passes all requests to /api/v1/... which we rewrite to /api/apple-webhook?path=...
export default async function handler(req: VercelRequest, res: VercelResponse) {
    let fullPath = req.query.path as string || '';
    if (fullPath.startsWith('passes/v1/')) {
        fullPath = fullPath.replace('passes/v1/', '');
    }
    const parts = fullPath.split('/').filter(Boolean);

    if (req.method === 'POST' && parts[0] === 'log') {
        const payload = req.body || {};
        console.log('[Passbook Web Service LOG]:', JSON.stringify(payload));
        return res.status(200).end();
    }

    // Endpoint 1: GET /devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
    if (req.method === 'GET' && parts[0] === 'devices' && parts[2] === 'registrations' && parts.length === 4) {
        const deviceId = parts[1];
        const passType = parts[3];
        const since = req.query.passesUpdatedSince as string;

        const registrations = await db.select({
            serialNumber: walletPushRegistrations.serialNumber,
            updatedAt: walletPushRegistrations.updatedAt
        })
            .from(walletPushRegistrations)
            .where(and(
                eq(walletPushRegistrations.deviceLibraryIdentifier, deviceId),
                eq(walletPushRegistrations.passTypeIdentifier, passType),
                since ? gte(walletPushRegistrations.updatedAt, new Date(since)) : undefined
            ));

        if (registrations.length === 0) return res.status(204).end();

        // Find the most recent update time to serve as the update tag
        let maxUpdate = registrations[0].updatedAt;
        for (const r of registrations) {
            if (r.updatedAt && maxUpdate && r.updatedAt.getTime() > maxUpdate.getTime()) {
                maxUpdate = r.updatedAt;
            }
        }

        return res.status(200).json({
            lastUpdated: maxUpdate ? maxUpdate.toISOString() : new Date().toISOString(),
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

        // Must explicitly generate and stream the bundle back. Apple Wallet refuses to follow HTTP redirects.
        return await handleApplePass(req, res, cardResults[0].slug as string);
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
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { console.error('Failed to parse body', e); }
            }
            const pushToken = body?.pushToken;
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
