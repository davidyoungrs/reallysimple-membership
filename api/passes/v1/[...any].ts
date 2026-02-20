import { db } from '../../../src/db/index.js';
import { walletPushRegistrations, businessCards, users } from '../../../src/db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Apple Passbook Web Service API Handler
 * Standard endpoints:
 * - POST /v1/devices/{id}/registrations/{type}/{serial}
 * - DELETE /v1/devices/{id}/registrations/{type}/{serial}
 * - GET /v1/devices/{id}/registrations/{type}
 * - GET /v1/passes/{type}/{serial}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, headers } = req;
    const parts = (query.any as string[]) || []; // Assuming Vercel routes [...any]

    // Manual Path Decoding if needed
    // /v1 is handled by the route, next parts are:
    // devices/{id}/registrations/{type}/{serial}
    // passes/{type}/{serial}

    try {
        if (parts[0] === 'devices') {
            const deviceId = parts[1];
            const passType = parts[3] === 'registrations' ? parts[4] : null;
            const serial = parts[3] === 'registrations' ? parts[5] : null;

            if (method === 'POST') {
                return handleRegister(req, res, deviceId, passType, serial);
            } else if (method === 'DELETE') {
                return handleUnregister(req, res, deviceId, passType, serial);
            } else if (method === 'GET') {
                const type = parts[3]; // /v1/devices/{id}/registrations/{type}
                return handleGetSerialNumbers(req, res, deviceId, type);
            }
        }

        if (parts[0] === 'passes') {
            const passType = parts[1];
            const serial = parts[2];
            return handleGetPass(req, res, passType, serial);
        }

        return res.status(404).end();
    } catch (error) {
        console.error('Passbook Web Service Error:', error);
        return res.status(500).end();
    }
}

async function handleRegister(req: VercelRequest, res: VercelResponse, deviceId: string, passType: string | null, serialNumber: string | null) {
    if (!passType || !serialNumber) return res.status(400).end();
    const { pushToken } = req.body;
    const auth = req.headers.authorization;

    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();

    // Verify token (for now we use simple card.uid check as token)
    const token = auth.replace('ApplePass ', '');
    // In production, we should securely hash or sign this.
    // For this implementation, token is base64(serialNumber)
    if (Buffer.from(token, 'base64').toString() !== serialNumber) {
        return res.status(401).end();
    }

    await db.insert(walletPushRegistrations)
        .values({
            deviceLibraryIdentifier: deviceId,
            pushToken,
            passTypeIdentifier: passType,
            serialNumber,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: [walletPushRegistrations.deviceLibraryIdentifier, walletPushRegistrations.serialNumber],
            set: { pushToken, updatedAt: new Date() }
        });

    return res.status(201).end();
}

async function handleUnregister(req: VercelRequest, res: VercelResponse, deviceId: string, passType: string | null, serialNumber: string | null) {
    if (!passType || !serialNumber) return res.status(400).end();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();

    await db.delete(walletPushRegistrations)
        .where(and(
            eq(walletPushRegistrations.deviceLibraryIdentifier, deviceId),
            eq(walletPushRegistrations.serialNumber, serialNumber)
        ));

    return res.status(200).end();
}

async function handleGetSerialNumbers(req: VercelRequest, res: VercelResponse, deviceId: string, passType: string | null) {
    if (!passType) return res.status(400).end();
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

async function handleGetPass(req: VercelRequest, res: VercelResponse, passType: string, serialNumber: string) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('ApplePass ')) return res.status(401).end();

    // Re-generate the pass but with current data (will be voided if tier lapsed)
    // We can reuse the logic from api/passes.ts by calling its internal handler or redirecting.
    // However, since handles are exported, we can import it.

    // For now, let's redirect to the main pass handler with the serial (uid)
    // Apple expects the actual .pkpass file here.

    // Better: Fetch card by UID and generate pass
    const cardResults = await db.select().from(businessCards).where(eq(businessCards.uid, serialNumber)).limit(1);
    if (cardResults.length === 0) return res.status(404).end();

    // Redirect to the slug-based pass generator
    const slug = cardResults[0].slug;
    return res.redirect(`/api/passes?slug=${slug}`);
}
