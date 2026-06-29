import { db } from '../src/db/index.js';
import { clubs, membershipTemplates, memberships, clubAdmins, users, walletPushRegistrations } from '../src/db/schema.js';
import { eq, and, or, sql, desc, asc, inArray, lt, isNull } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { checkRateLimit, validatePayload, isBot, setupResponseLogging } from './_utils/security.js';

export function normalizeR2Url(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.includes('.r2.dev/')) {
        const parts = url.split('.r2.dev/');
        if (parts.length > 1) {
            const key = parts[1];
            const customDomain = process.env.R2_CUSTOM_DOMAIN?.trim();
            if (customDomain) {
                const cleanDomain = customDomain.replace(/\/$/, '');
                return `${cleanDomain}/${key}`;
            }
            return `/api/public?resource=asset&key=${key}`;
        }
    }
    return url;
}

export function generateMembershipNumber(format: string, clubSlug: string, membershipType: string, sequenceNumber: number): string {
    let result = format || '{NUMBER}';
    
    // Replace {CLUB}
    result = result.replace(/\{CLUB\}/g, (clubSlug || 'CLUB').toUpperCase());
    
    // Replace {TYPE}
    const typeCode = (membershipType || 'MEM').substring(0, 3).toUpperCase();
    result = result.replace(/\{TYPE\}/g, typeCode);
    
    // Replace {YYYY}, {YY}, {MM}
    const now = new Date();
    result = result.replace(/\{YYYY\}/g, String(now.getFullYear()));
    result = result.replace(/\{YY\}/g, String(now.getFullYear()).slice(-2));
    result = result.replace(/\{MM\}/g, String(now.getMonth() + 1).padStart(2, '0'));
    
    // Replace {NUMBER} or {NUMBER:X}
    const numberRegex = /\{NUMBER(?::(\d+))?\}/g;
    result = result.replace(numberRegex, (_, paddingStr) => {
        const padding = paddingStr ? parseInt(paddingStr, 10) : 3;
        return String(sequenceNumber).padStart(padding, '0');
    });
    
    return result;
}

import { buildGoogleWalletMembershipObject, patchGoogleWalletObject } from './_utils/googleWallet.js';

export async function syncMembershipWallet(membershipUid: string) {
    try {
        const devices = await db.select({
            id: walletPushRegistrations.id,
            pushToken: walletPushRegistrations.pushToken,
            passType: walletPushRegistrations.passTypeIdentifier
        })
            .from(walletPushRegistrations)
            .where(eq(walletPushRegistrations.serialNumber, membershipUid));

        if (devices.length === 0) {
            console.log(`[APNs-Membership] No devices registered for membership UID ${membershipUid}`);
            return;
        }

        const registrationIds = devices.map(d => d.id);
        if (registrationIds.length > 0) {
            await db.update(walletPushRegistrations)
                .set({ updatedAt: new Date() })
                .where(inArray(walletPushRegistrations.id, registrationIds));
        }

        const { sendPassPush } = await import('./_utils/apns.js');
        let successCount = 0;
        for (const device of devices) {
            try {
                await sendPassPush(device.pushToken, device.passType);
                successCount++;
            } catch (pushErr) {
                console.error(`[APNs-Membership] Failed push to ${device.pushToken.substring(0, 8)}:`, pushErr);
            }
        }
        if (devices.length > 0) {
            console.log(`[APNs-Membership] Pushed updates to ${successCount}/${devices.length} devices for membership UID ${membershipUid}`);
        }

        // --- Google Wallet Sync ---
        try {
            const GOOGLE_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
            if (GOOGLE_ISSUER_ID) {
                const results = await db.select({
                    membership: memberships,
                    club: clubs,
                    template: membershipTemplates,
                })
                .from(memberships)
                .innerJoin(clubs, eq(memberships.clubId, clubs.id))
                .leftJoin(membershipTemplates, eq(memberships.templateId, membershipTemplates.id))
                .where(eq(memberships.uid, membershipUid))
                .limit(1);

                if (results.length > 0) {
                    const { membership, club, template } = results[0];
                    const baseUrl = 'https://reallysimple-membership.vercel.app';
                    const genericObject = buildGoogleWalletMembershipObject(membership, club, template, baseUrl, GOOGLE_ISSUER_ID);
                    
                    // The objectId is the id of the genericObject
                    await patchGoogleWalletObject(genericObject.id, genericObject);
                    console.log(`[GoogleWallet-Membership] Pushed update to Google Wallet for UID ${membershipUid}`);
                }
            }
        } catch (gErr) {
            console.error('[GoogleWallet-Membership] Sync error:', gErr);
        }

    } catch (err) {
        console.error('[Wallet-Sync] Overall sync error:', err);
    }
}

async function resolveAndPromoteAdmin(
    adminIdentifier: string,
    clerk: any
): Promise<{ clerkId: string | null; email: string | null }> {
    const trimmed = adminIdentifier.trim();
    if (trimmed.startsWith('user_')) {
        try {
            await clerk.users.updateUser(trimmed, {
                publicMetadata: { role: 'admin' }
            });
            console.log(`[Clerk-Invite] Promoted direct Clerk ID ${trimmed} to admin role`);
        } catch (err) {
            console.error(`[Clerk-Invite] Failed to promote direct Clerk ID ${trimmed}:`, err);
        }
        return { clerkId: trimmed, email: null };
    } else if (trimmed.includes('@')) {
        const cleanEmail = trimmed.toLowerCase();
        try {
            const usersList = await clerk.users.getUserList({ emailAddress: [cleanEmail] });
            const clerkUsers = Array.isArray(usersList) ? usersList : (usersList as any)?.data || [];
            if (clerkUsers.length > 0) {
                const clerkUser = clerkUsers[0];
                await clerk.users.updateUser(clerkUser.id, {
                    publicMetadata: { role: 'admin' }
                });
                console.log(`[Clerk-Invite] Found existing Clerk user for email ${cleanEmail}. Bound to ${clerkUser.id} and promoted to admin.`);
                return { clerkId: clerkUser.id, email: cleanEmail };
            }
        } catch (err) {
            console.error(`[Clerk-Invite] Error searching/updating Clerk user for email ${cleanEmail}:`, err);
        }
        return { clerkId: null, email: cleanEmail };
    }
    return { clerkId: null, email: null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setupResponseLogging(req, res);

    if (isBot(req)) {
        return res.status(403).json({ error: 'Access Denied: Automated tools are blocked.' });
    }

    if (!(await checkRateLimit(req, res))) return;
    if (!validatePayload(req, res)) return;

    const { method } = req;
    const query = req.query;
    const resource = query.resource as string;
    const action = query.action as string;

    // --- 1. PUBLIC ENDPOINTS (NO AUTH REQUIRED) ---

    // A. Public Membership Verification (GET /api/membership?resource=memberships&slug=SLUG&public=true)
    if (method === 'GET' && resource === 'memberships' && query.slug && query.public === 'true') {
        return await handleGetPublicMembership(req, res);
    }

    // B. Public Club Branding Fetch (GET /api/membership?resource=clubs&slug=SLUG&public=true)
    if (method === 'GET' && resource === 'clubs' && query.slug && query.public === 'true') {
        return await handleGetPublicClub(req, res);
    }

    // --- 2. PROTECTED ENDPOINTS (AUTHENTICATION REQUIRED) ---
    let authenticatedUserId = 'usr_admin';
    let authenticatedUserEmail = 'admin@reallysimpleapps.com';
    let isSuperUser = true;

    const authBypass = process.env.NODE_ENV !== 'production' && process.env.CLERK_BYPASS_AUTH === 'true';

    if (!authBypass) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const verifiedToken = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });
            authenticatedUserId = verifiedToken.sub;

            // Fetch Clerk user details to get email and admin status
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            const clerkUser = await clerk.users.getUser(authenticatedUserId);
            authenticatedUserEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
            const emails = clerkUser.emailAddresses?.map(e => e.emailAddress.toLowerCase().trim()) || [];
            const superuserEmail = (process.env.SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk').toLowerCase();
            isSuperUser = clerkUser.publicMetadata?.role === 'super_admin' || 
                          emails.includes(superuserEmail) ||
                          authenticatedUserEmail.toLowerCase() === superuserEmail;

            // Auto-link pending email-based admin invitations to this Clerk ID
            if (emails.length > 0) {
                const pendingLinks = await db.select()
                    .from(clubAdmins)
                    .where(and(
                        inArray(clubAdmins.email, emails),
                        isNull(clubAdmins.clerkId)
                    ));

                if (pendingLinks.length > 0) {
                    await db.transaction(async (tx) => {
                        for (const link of pendingLinks) {
                            await tx.update(clubAdmins)
                                .set({ clerkId: authenticatedUserId })
                                .where(eq(clubAdmins.id, link.id));
                        }
                    });
                    console.log(`[Clerk-Auto-Link] Auto-bound Clerk ID ${authenticatedUserId} to ${pendingLinks.length} clubs for verified email(s): ${emails.join(', ')}`);

                    // Promote Clerk metadata role to 'admin' so they pass frontend layout guards
                    const currentRole = clerkUser.publicMetadata?.role;
                    if (currentRole !== 'super_admin' && currentRole !== 'admin') {
                        await clerk.users.updateUser(authenticatedUserId, {
                            publicMetadata: {
                                role: 'admin'
                            }
                        });
                        console.log(`[Clerk-Auto-Link] Automatically set Clerk role to 'admin' for user ${authenticatedUserId}`);
                    }
                }
            }
        } catch (err) {
            console.error('[Clerk-Auth-Membership] Verification failed:', err);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    }

    // Helper: Check if user is admin of a specific club
    const checkIsClubAdmin = async (clubId: number): Promise<boolean> => {
        if (isSuperUser) return true;

        // Check if club is suspended
        const clubRecord = await db.select({ isSuspended: clubs.isSuspended })
            .from(clubs)
            .where(eq(clubs.id, clubId))
            .limit(1);
        if (clubRecord.length > 0 && clubRecord[0].isSuspended) {
            throw new Error('CLUB_SUSPENDED');
        }

        const adminCheck = await db.select()
            .from(clubAdmins)
            .where(and(eq(clubAdmins.clerkId, authenticatedUserId), eq(clubAdmins.clubId, clubId)))
            .limit(1);
        return adminCheck.length > 0;
    };

    try {
        // A. SYNC ROLE (GET /api/membership?action=sync_role)
        if (action === 'sync_role') {
            const adminCheck = await db.select()
                .from(clubAdmins)
                .where(eq(clubAdmins.clerkId, authenticatedUserId))
                .limit(1);

            return res.status(200).json({
                success: true,
                isLinked: adminCheck.length > 0 || isSuperUser
            });
        }

        // C. PRESIGNED R2 UPLOAD URL (GET or POST /api/membership?action=presign)
        if (action === 'presign') {
            const filename = query.filename as string || req.body?.filename;
            const contentType = query.contentType as string || req.body?.contentType;
            if (!filename || !contentType) {
                return res.status(400).json({ error: 'Missing filename or contentType' });
            }
            const key = `memberships/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
            const { generateUploadUrl } = await import('../src/utils/storage.js');
            const uploadUrl = await generateUploadUrl(key, contentType);
            const publicUrl = `/api/public?resource=asset&key=${key}`;

            return res.status(200).json({ uploadUrl, publicUrl, key });
        }

        // C2. VERIFY MEMBERSHIP PASS (GET or POST /api/membership?action=verify)
        if (action === 'verify') {
            const slugVal = (query.slug as string) || req.body?.slug;
            if (!slugVal) {
                return res.status(400).json({ error: 'Missing membership slug' });
            }

            // Find membership
            const membershipRecords = await db.select()
                .from(memberships)
                .where(eq(memberships.slug, slugVal))
                .limit(1);

            if (membershipRecords.length === 0) {
                return res.status(404).json({ valid: false, error: 'Membership pass not found' });
            }

            const membershipRecord = membershipRecords[0];

            // Security: Verify current user is admin of this membership's club
            const hasAccess = await checkIsClubAdmin(membershipRecord.clubId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Forbidden: You are not authorized to verify passes for this club.' });
            }

            const clubRecords = await db.select().from(clubs).where(eq(clubs.id, membershipRecord.clubId)).limit(1);
            const clubRecord = clubRecords[0];

            const now = new Date();
            const isExpired = now > new Date(membershipRecord.expiresAt);
            const isValid = membershipRecord.status === 'active' && !isExpired && !clubRecord.isSuspended;

            let statusMessage = 'active';
            if (clubRecord.isSuspended) {
                statusMessage = 'club_suspended';
            } else if (membershipRecord.status === 'revoked') {
                statusMessage = 'revoked';
            } else if (isExpired || membershipRecord.status === 'expired') {
                statusMessage = 'expired';
            }

            return res.status(200).json({
                valid: isValid,
                status: statusMessage,
                membership: {
                    id: membershipRecord.id,
                    memberName: membershipRecord.memberName,
                    memberEmail: membershipRecord.memberEmail,
                    memberPhoto: membershipRecord.memberPhoto,
                    membershipNumber: membershipRecord.membershipNumber,
                    membershipType: membershipRecord.membershipType,
                    status: membershipRecord.status,
                    expiresAt: membershipRecord.expiresAt,
                    memberSince: membershipRecord.memberSince,
                    slug: membershipRecord.slug
                },
                club: {
                    name: clubRecord.name,
                    slug: clubRecord.slug
                }
            });
        }

        // D. PROXY UPLOAD TO R2 (POST /api/membership?action=upload)
        if (action === 'upload') {
            const filename = (query.filename as string) || req.body?.filename;
            const contentType = (query.contentType as string) || req.body?.contentType || req.headers['content-type'];
            if (!filename || !contentType) {
                return res.status(400).json({ error: 'Missing filename or contentType' });
            }

            const key = `memberships/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
            const publicUrl = `/api/public?resource=asset&key=${key}`;

            let buffer: Buffer;
            if ((req as any).__rawBody) {
                buffer = (req as any).__rawBody;
            } else if (req.body instanceof Buffer) {
                buffer = req.body;
            } else if (typeof req.body === 'string') {
                buffer = Buffer.from(req.body, 'binary');
            } else {
                const buffers = [];
                for await (const chunk of req) {
                    buffers.push(chunk);
                }
                buffer = Buffer.concat(buffers);
            }

            const { uploadToR2 } = await import('../src/utils/storage.js');
            await uploadToR2(key, buffer, contentType);

            return res.status(200).json({ success: true, publicUrl });
        }

        // --- ROUTE BY RESOURCE ---
        switch (resource) {
            case 'clubs':
                return await handleClubs(req, res, authenticatedUserId, isSuperUser, checkIsClubAdmin);
            case 'templates':
                return await handleTemplates(req, res, authenticatedUserId, isSuperUser, checkIsClubAdmin);
            case 'memberships':
                return await handleMemberships(req, res, authenticatedUserId, isSuperUser, authenticatedUserEmail, checkIsClubAdmin);
            default:
                return res.status(400).json({ error: 'Invalid resource type' });
        }
    } catch (error: any) {
        if (error?.message === 'CLUB_SUSPENDED') {
            return res.status(403).json({ error: 'suspended' });
        }
        console.error('Membership API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// ==========================================
// PUBLIC HANDLERS
// ==========================================

async function handleGetPublicMembership(req: VercelRequest, res: VercelResponse) {
    const slug = req.query.slug as string;
    const records = await db.select({
        id: memberships.id,
        uid: memberships.uid,
        templateId: memberships.templateId,
        clubId: memberships.clubId,
        memberName: memberships.memberName,
        memberPhoto: memberships.memberPhoto,
        membershipNumber: memberships.membershipNumber,
        membershipType: memberships.membershipType,
        stripImageUrl: memberships.stripImageUrl,
        cardConfig: memberships.cardConfig,
        slug: memberships.slug,
        status: memberships.status,
        issuedAt: memberships.issuedAt,
        expiresAt: memberships.expiresAt,
        clubName: clubs.name,
        clubLogoUrl: clubs.logoUrl,
        clubBrandingConfig: clubs.brandingConfig,
        isClubSuspended: clubs.isSuspended,
    })
    .from(memberships)
    .innerJoin(clubs, eq(memberships.clubId, clubs.id))
    .where(eq(memberships.slug, slug))
    .limit(1);

    if (records.length === 0) {
        return res.status(404).json({ error: 'Membership not found' });
    }

    const row = records[0];
    const membership = {
        ...row,
        memberPhoto: normalizeR2Url(row.memberPhoto),
        stripImageUrl: normalizeR2Url(row.stripImageUrl),
        clubLogoUrl: normalizeR2Url(row.clubLogoUrl),
    };

    return res.status(200).json({ success: true, membership });
}

async function handleGetPublicClub(req: VercelRequest, res: VercelResponse) {
    const slug = req.query.slug as string;
    const records = await db.select({
        id: clubs.id,
        uid: clubs.uid,
        name: clubs.name,
        slug: clubs.slug,
        logoUrl: clubs.logoUrl,
        brandingConfig: clubs.brandingConfig,
        membershipNumberFormat: clubs.membershipNumberFormat,
    })
    .from(clubs)
    .where(eq(clubs.slug, slug))
    .limit(1);

    if (records.length === 0) {
        return res.status(404).json({ error: 'Club not found' });
    }

    const club = {
        ...records[0],
        logoUrl: normalizeR2Url(records[0].logoUrl)
    };

    return res.status(200).json({ success: true, club });
}

// ==========================================
// CLUBS RESOURCE HANDLERS
// ==========================================

async function handleClubs(
    req: VercelRequest,
    res: VercelResponse,
    userId: string,
    isSuperUser: boolean,
    checkIsClubAdmin: (clubId: number) => Promise<boolean>
) {
    const { method, query, body } = req;

    if (method === 'GET') {
        const id = query.id ? Number(query.id) : null;
        const slug = query.slug as string;

        if (id || slug) {
            const whereClause = id ? eq(clubs.id, id) : eq(clubs.slug, slug);
            const records = await db.select().from(clubs).where(whereClause).limit(1);
            if (records.length === 0) return res.status(404).json({ error: 'Club not found' });

            const club = {
                ...records[0],
                logoUrl: normalizeR2Url(records[0].logoUrl)
            };
            const hasAccess = await checkIsClubAdmin(club.id);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            // Fetch club admins list
            const admins = await db.select().from(clubAdmins).where(eq(clubAdmins.clubId, club.id));
            if (isSuperUser) {
                const superAdminExists = admins.some(a => a.clerkId === userId);
                if (!superAdminExists) {
                    admins.push({
                        id: -1,
                        clubId: club.id,
                        clerkId: userId,
                        email: 'superuser@reallysimpleapps.com',
                        createdAt: new Date()
                    } as any);
                }
            }

            return res.status(200).json({ success: true, club, admins });
        }

        // List clubs
        if (isSuperUser) {
            // Super User gets everything
            const allClubs = await db.select().from(clubs).orderBy(asc(clubs.sortOrder), desc(clubs.createdAt));
            const normalizedClubs = allClubs.map(c => ({
                ...c,
                logoUrl: normalizeR2Url(c.logoUrl)
            }));
            return res.status(200).json({ success: true, clubs: normalizedClubs });
        } else {
            // Club Admins get only their clubs
            const myClubs = await db.select({
                id: clubs.id,
                uid: clubs.uid,
                name: clubs.name,
                slug: clubs.slug,
                logoUrl: clubs.logoUrl,
                brandingConfig: clubs.brandingConfig,
                membershipNumberFormat: clubs.membershipNumberFormat,
                isSuspended: clubs.isSuspended,
                sortOrder: clubs.sortOrder,
                createdAt: clubs.createdAt,
            })
            .from(clubs)
            .innerJoin(clubAdmins, eq(clubAdmins.clubId, clubs.id))
            .where(eq(clubAdmins.clerkId, userId))
            .orderBy(asc(clubs.sortOrder), desc(clubs.createdAt));

            const normalizedClubs = myClubs.map(c => ({
                ...c,
                logoUrl: normalizeR2Url(c.logoUrl)
            }));

            return res.status(200).json({ success: true, clubs: normalizedClubs });
        }
    }

    if (method === 'POST') {
        if (!isSuperUser) return res.status(403).json({ error: 'Forbidden: Super User access required' });

        const { name, slug, logoUrl, brandingConfig, membershipNumberFormat, admins } = body;
        if (!name || !slug || !brandingConfig) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify slug uniqueness
        const collision = await db.select().from(clubs).where(eq(clubs.slug, slug)).limit(1);
        if (collision.length > 0) {
            return res.status(400).json({ error: 'Club slug already taken' });
        }

        // Resolve admins before transaction to avoid holding database locks
        const resolvedAdmins = [];
        if (Array.isArray(admins) && admins.length > 0) {
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            for (const adminIdentifier of admins) {
                const resolved = await resolveAndPromoteAdmin(adminIdentifier, clerk);
                if (resolved.clerkId || resolved.email) {
                    resolvedAdmins.push(resolved);
                }
            }
        }

        // Create club in a transaction
        const result = await db.transaction(async (tx) => {
            const [newClub] = await tx.insert(clubs)
                .values({
                    name,
                    slug,
                    logoUrl,
                    brandingConfig,
                    membershipNumberFormat: membershipNumberFormat || '{NUMBER}',
                    createdBy: userId,
                })
                .returning();

            // Insert resolved admins
            for (const admin of resolvedAdmins) {
                await tx.insert(clubAdmins).values({
                    clubId: newClub.id,
                    clerkId: admin.clerkId,
                    email: admin.email,
                    role: 'admin',
                });
            }

            return newClub;
        });

        return res.status(201).json({ success: true, club: result });
    }

    if (method === 'PUT') {
        if (query.action === 'reorder') {
            const { order } = body;
            if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid order array' });

            for (const item of order) {
                const hasAccess = await checkIsClubAdmin(Number(item.id));
                if (!hasAccess) return res.status(403).json({ error: `Forbidden: No access to club ${item.id}` });
            }

            await db.transaction(async (tx) => {
                for (const item of order) {
                    await tx.update(clubs)
                        .set({ sortOrder: Number(item.sortOrder) })
                        .where(eq(clubs.id, Number(item.id)));
                }
            });

            return res.status(200).json({ success: true });
        }

        const { id, name, slug, logoUrl, brandingConfig, membershipNumberFormat, admins, isSuspended } = body;
        if (!id) return res.status(400).json({ error: 'Missing club ID' });

        const hasAccess = await checkIsClubAdmin(Number(id));
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        const clubId = Number(id);

        // Fetch original club status to check if suspension changed
        const existingClubs = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
        const oldSuspended = existingClubs[0]?.isSuspended || false;

        // Resolve admins before transaction to avoid holding database locks
        const resolvedAdmins = [];
        if (isSuperUser && Array.isArray(admins)) {
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            for (const adminIdentifier of admins) {
                const resolved = await resolveAndPromoteAdmin(adminIdentifier, clerk);
                if (resolved.clerkId || resolved.email) {
                    resolvedAdmins.push(resolved);
                }
            }
        }

        // Update in transaction
        console.log(`[PUT-Club] Updating club ${clubId}. isSuperUser: ${isSuperUser}, isSuspended sent: ${isSuspended}, type: ${typeof isSuspended}`);
        const result = await db.transaction(async (tx) => {
            const updateData: any = {
                name,
                slug,
                logoUrl,
                brandingConfig,
                membershipNumberFormat,
                updatedAt: new Date(),
            };

            if (isSuperUser && typeof isSuspended === 'boolean') {
                updateData.isSuspended = isSuspended;
                console.log(`[PUT-Club] Setting isSuspended = ${isSuspended} for club ${clubId}`);
            }

            const [updatedClub] = await tx.update(clubs)
                .set(updateData)
                .where(eq(clubs.id, clubId))
                .returning();

            // Admin updates (Super User only)
            if (isSuperUser && Array.isArray(admins)) {
                // Remove existing admins and re-insert
                await tx.delete(clubAdmins).where(eq(clubAdmins.clubId, clubId));
                for (const admin of resolvedAdmins) {
                    await tx.insert(clubAdmins).values({
                        clubId,
                        clerkId: admin.clerkId,
                        email: admin.email,
                        role: 'admin',
                    });
                }
            }

            return updatedClub;
        });

        // Trigger wallet sync for all memberships of the club if suspension status changed
        if (isSuperUser && typeof isSuspended === 'boolean' && isSuspended !== oldSuspended) {
            const clubMemberships = await db.select({ uid: memberships.uid })
                .from(memberships)
                .where(eq(memberships.clubId, clubId));
            
            console.log(`[Suspension-Wallet-Sync] Triggering sync for ${clubMemberships.length} memberships...`);
            const syncPromises = clubMemberships.map(member => 
                syncMembershipWallet(member.uid).catch(err => {
                    console.error(`[Suspension-Wallet-Sync] Error syncing membership ${member.uid}:`, err);
                })
            );
            await Promise.all(syncPromises);
            console.log(`[Suspension-Wallet-Sync] Completed syncing all memberships.`);
        }

        return res.status(200).json({ success: true, club: result });
    }

    if (method === 'DELETE') {
        if (!isSuperUser) return res.status(403).json({ error: 'Forbidden: Super User access required' });
        const id = Number(query.id);
        if (!id) return res.status(400).json({ error: 'Missing club ID' });

        await db.delete(clubs).where(eq(clubs.id, id));
        return res.status(200).json({ success: true, message: 'Club deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// ==========================================
// TEMPLATES RESOURCE HANDLERS
// ==========================================

async function handleTemplates(
    req: VercelRequest,
    res: VercelResponse,
    userId: string,
    isSuperUser: boolean,
    checkIsClubAdmin: (clubId: number) => Promise<boolean>
) {
    const { method, query, body } = req;

    if (method === 'GET') {
        const id = query.id ? Number(query.id) : null;
        const clubId = query.clubId ? Number(query.clubId) : null;

        if (id) {
            const records = await db.select().from(membershipTemplates).where(eq(membershipTemplates.id, id)).limit(1);
            if (records.length === 0) return res.status(404).json({ error: 'Template not found' });

            const template = records[0];
            const hasAccess = await checkIsClubAdmin(template.clubId);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            return res.status(200).json({ success: true, template });
        }

        if (clubId) {
            const hasAccess = await checkIsClubAdmin(clubId);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            const templates = await db.select().from(membershipTemplates).where(eq(membershipTemplates.clubId, clubId)).orderBy(desc(membershipTemplates.createdAt));
            return res.status(200).json({ success: true, templates });
        }

        return res.status(400).json({ error: 'Missing id or clubId parameter' });
    }

    if (method === 'POST') {
        const { clubId, name, membershipType, cardConfig, durationMonths, isActive } = body;
        if (!clubId || !name || !membershipType || !cardConfig) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify that the current user has admin access to this club
        const hasAccess = await checkIsClubAdmin(Number(clubId));
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        // Limit maximum templates per club to 6
        const existingTemplates = await db.select().from(membershipTemplates).where(eq(membershipTemplates.clubId, Number(clubId)));
        if (existingTemplates.length >= 6) {
            return res.status(400).json({ error: 'Maximum limit of 6 templates reached for this club' });
        }

        const [newTemplate] = await db.insert(membershipTemplates)
            .values({
                clubId: Number(clubId),
                name,
                membershipType,
                cardConfig,
                durationMonths: durationMonths ? Number(durationMonths) : 12,
                isActive: isActive !== false,
                createdBy: userId,
            })
            .returning();

        return res.status(201).json({ success: true, template: newTemplate });
    }

    if (method === 'PUT') {
        const { id, name, membershipType, cardConfig, durationMonths, isActive } = body;
        if (!id) return res.status(400).json({ error: 'Missing template ID' });

        // Verify that the current user has admin access to the template's club
        const records = await db.select({ clubId: membershipTemplates.clubId })
            .from(membershipTemplates)
            .where(eq(membershipTemplates.id, Number(id)))
            .limit(1);
        if (records.length === 0) return res.status(404).json({ error: 'Template not found' });
        
        const hasAccess = await checkIsClubAdmin(records[0].clubId);
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        const [updatedTemplate] = await db.update(membershipTemplates)
            .set({
                name,
                membershipType,
                cardConfig,
                durationMonths: durationMonths ? Number(durationMonths) : undefined,
                isActive,
                updatedAt: new Date(),
            })
            .where(eq(membershipTemplates.id, Number(id)))
            .returning();

        return res.status(200).json({ success: true, template: updatedTemplate });
    }

    if (method === 'DELETE') {
        const id = Number(query.id);
        if (!id) return res.status(400).json({ error: 'Missing template ID' });

        // Verify that the current user has admin access to the template's club
        const records = await db.select({ clubId: membershipTemplates.clubId })
            .from(membershipTemplates)
            .where(eq(membershipTemplates.id, id))
            .limit(1);
        if (records.length === 0) return res.status(404).json({ error: 'Template not found' });

        const hasAccess = await checkIsClubAdmin(records[0].clubId);
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        await db.delete(membershipTemplates).where(eq(membershipTemplates.id, id));
        return res.status(200).json({ success: true, message: 'Template deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// ==========================================
// MEMBERSHIPS RESOURCE HANDLERS
// ==========================================

function validateMemberInput(name: any, email: any): { valid: boolean; error?: string } {
    if (name === undefined || name === null || typeof name !== 'string') {
        return { valid: false, error: 'Name is required and must be a string' };
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters long' };
    }
    if (trimmedName.length > 100) {
        return { valid: false, error: 'Name must be at most 100 characters long' };
    }
    // Reject HTML tags and javascript hrefs
    if (/<[^>]*>|javascript:/i.test(trimmedName)) {
        return { valid: false, error: 'Name contains invalid characters or script content' };
    }

    if (email === undefined || email === null || typeof email !== 'string') {
        return { valid: false, error: 'Email is required and must be a string' };
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length > 100) {
        return { valid: false, error: 'Email must be at most 100 characters long' };
    }
    // RFC 5322 regex for standard emails
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Email address is invalid or malformed' };
    }

    return { valid: true };
}

async function handleMemberships(
    req: VercelRequest,
    res: VercelResponse,
    userId: string,
    isSuperUser: boolean,
    authenticatedUserEmail: string,
    checkIsClubAdmin: (clubId: number) => Promise<boolean>
) {
    const { method, query, body } = req;

    if (method === 'GET') {
        const id = query.id ? Number(query.id) : null;
        const clubId = query.clubId ? Number(query.clubId) : null;

        if (id) {
            const records = await db.select().from(memberships).where(eq(memberships.id, id)).limit(1);
            if (records.length === 0) return res.status(404).json({ error: 'Membership not found' });

            const membership = {
                ...records[0],
                memberPhoto: normalizeR2Url(records[0].memberPhoto),
                stripImageUrl: normalizeR2Url(records[0].stripImageUrl),
            };
            const hasAccess = await checkIsClubAdmin(membership.clubId);
            if (!hasAccess && membership.memberEmail !== authenticatedUserEmail) {
                return res.status(403).json({ error: 'Forbidden: Access denied' });
            }

            return res.status(200).json({ success: true, membership });
        }

        if (clubId) {
            const hasAccess = await checkIsClubAdmin(clubId);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            // Auto-expire: any 'active' membership whose expiresAt is in the past
            // should be flipped to 'expired' before we return the list.
            const now = new Date();
            const expiredRows = await db.select({ id: memberships.id, uid: memberships.uid })
                .from(memberships)
                .where(and(
                    eq(memberships.clubId, clubId),
                    eq(memberships.status, 'active'),
                    lt(memberships.expiresAt, now)
                ));

            if (expiredRows.length > 0) {
                await db.update(memberships)
                    .set({ status: 'expired', updatedAt: now })
                    .where(and(
                        eq(memberships.clubId, clubId),
                        eq(memberships.status, 'active'),
                        lt(memberships.expiresAt, now)
                    ));
                // Push wallet updates for newly-expired passes
                for (const row of expiredRows) {
                    syncMembershipWallet(row.uid).catch(err =>
                        console.error(`[AutoExpire] wallet sync failed for ${row.uid}:`, err)
                    );
                }
                console.log(`[AutoExpire] Marked ${expiredRows.length} memberships as expired for club ${clubId}`);
            }

            const records = await db.select().from(memberships).where(eq(memberships.clubId, clubId)).orderBy(desc(memberships.createdAt));
            const normalizedRecords = records.map(r => ({
                ...r,
                memberPhoto: normalizeR2Url(r.memberPhoto),
                stripImageUrl: normalizeR2Url(r.stripImageUrl),
            }));
            return res.status(200).json({ success: true, memberships: normalizedRecords });
        }

        // If no clubId or id is provided, let's list memberships belonging to this user
        if (authenticatedUserEmail) {
            const myMemberships = await db.select({
                membership: memberships,
                clubName: clubs.name,
                clubLogoUrl: clubs.logoUrl,
            })
            .from(memberships)
            .innerJoin(clubs, eq(memberships.clubId, clubs.id))
            .where(eq(memberships.memberEmail, authenticatedUserEmail))
            .orderBy(desc(memberships.createdAt));

            const normalizedMemberships = myMemberships.map(m => ({
                ...m,
                membership: {
                    ...m.membership,
                    memberPhoto: normalizeR2Url(m.membership.memberPhoto),
                    stripImageUrl: normalizeR2Url(m.membership.stripImageUrl),
                },
                clubLogoUrl: normalizeR2Url(m.clubLogoUrl)
            }));

            return res.status(200).json({ success: true, memberships: normalizedMemberships });
        }

        return res.status(400).json({ error: 'Missing parameters' });
    }

    if (method === 'POST') {
        const action = query.action as string;

        // A. MANUAL PUSH UPDATE
        if (action === 'push') {
            const { id } = body;
            if (!id) return res.status(400).json({ error: 'Missing membership ID' });

            const records = await db.select().from(memberships).where(eq(memberships.id, Number(id))).limit(1);
            if (records.length === 0) return res.status(404).json({ error: 'Membership not found' });
            const membership = records[0];

            const hasAccess = await checkIsClubAdmin(membership.clubId);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            await syncMembershipWallet(membership.uid);

            return res.status(200).json({ success: true, message: 'Push notification triggered successfully' });
        }

        // B. BULK INSERTION
        if (action === 'bulk') {
            const { clubId, templateId, data: csvData } = body;
            if (!clubId || !templateId || !Array.isArray(csvData)) {
                return res.status(400).json({ error: 'Missing required parameters for bulk import' });
            }

            const parsedClubId = Number(clubId);
            const parsedTemplateId = Number(templateId);

            const hasAccess = await checkIsClubAdmin(parsedClubId);
            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

            // Fetch template & club details for snapshotting and number generation
            const templateRecords = await db.select().from(membershipTemplates).where(eq(membershipTemplates.id, parsedTemplateId)).limit(1);
            if (templateRecords.length === 0) return res.status(404).json({ error: 'Template not found' });
            const template = templateRecords[0];

            const clubRecords = await db.select().from(clubs).where(eq(clubs.id, parsedClubId)).limit(1);
            if (clubRecords.length === 0) return res.status(404).json({ error: 'Club not found' });
            const club = clubRecords[0];

            const results = [];
            const timestamp = Date.now();

            // Run in transaction to insert all records
            await db.transaction(async (tx) => {
                let index = 1;
                for (const row of csvData) {
                    const { name, email, photoUrl, membershipType, membershipNumber, slug, memberSince } = row;
                    
                    const validation = validateMemberInput(name, email);
                    if (!validation.valid) {
                        results.push({ name, email, success: false, error: validation.error });
                        continue;
                    }

                    // Auto-generate membership number if not provided
                    let finalNumber = membershipNumber;
                    let finalSlug = slug;
                    if (!finalNumber) {
                        let isUnique = false;
                        let counterOffset = index;
                        const countRecords = await tx.select({ count: sql<number>`count(*)` }).from(memberships).where(eq(memberships.clubId, parsedClubId));
                        const currentCount = Number(countRecords[0]?.count || 0);

                        while (!isUnique) {
                            const candidateNumber = generateMembershipNumber(
                                club.membershipNumberFormat,
                                club.slug,
                                membershipType,
                                currentCount + counterOffset
                            );
                            const candidateSlug = slug || `${club.slug}-${candidateNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                            const collision = await tx.select().from(memberships).where(eq(memberships.slug, candidateSlug)).limit(1);
                            if (collision.length === 0) {
                                finalNumber = candidateNumber;
                                finalSlug = candidateSlug;
                                isUnique = true;
                            } else {
                                counterOffset++;
                            }
                        }
                        index = counterOffset + 1;
                    } else {
                        if (!finalSlug) {
                            finalSlug = `${club.slug}-${finalNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        }
                    }

                    // Check slug collision
                    const existing = await tx.select().from(memberships).where(eq(memberships.slug, finalSlug)).limit(1);
                    if (existing.length > 0) {
                        results.push({ name, email, success: false, error: `Slug collision: ${finalSlug} is already in use` });
                        continue;
                    }

                    const issuedAt = new Date();
                    const expiresAt = new Date();
                    expiresAt.setMonth(expiresAt.getMonth() + template.durationMonths);

                    try {
                        const [inserted] = await tx.insert(memberships)
                            .values({
                                templateId: parsedTemplateId,
                                clubId: parsedClubId,
                                memberName: name,
                                memberEmail: email,
                                memberPhoto: photoUrl || null,
                                membershipNumber: finalNumber,
                                membershipType: membershipType || template.membershipType,
                                cardConfig: template.cardConfig,
                                memberSince: memberSince ? Number(memberSince) : new Date().getFullYear(),
                                slug: finalSlug,
                                status: 'active',
                                issuedAt,
                                expiresAt,
                                issuedBy: userId,
                            })
                            .returning();

                        results.push({ name, email, success: true, id: inserted.id, slug: finalSlug });
                    } catch (err: any) {
                        results.push({ name, email, success: false, error: err.message });
                    }
                }
            });
            import('./_utils/membership_emails.js').then(({ sendWelcomeEmail }) => {
                results.forEach(r => {
                    if (r.success) {
                        sendWelcomeEmail(r.email, r.name, club.name, club.slug, r.slug!).catch(e => console.error(e));
                    }
                });
            }).catch(e => console.error('Failed to load membership_emails utility', e));

            return res.status(200).json({ success: true, results });
        }

        // B. SINGLE CARD CREATION
        const { templateId, memberName, memberEmail, memberPhoto, stripImageUrl, membershipNumber, slug, cardConfig, expiresAt: customExpiresAt, memberSince } = body;
        if (!templateId || !memberName || !memberEmail) {
            return res.status(400).json({ error: 'Missing required fields: templateId, memberName, memberEmail' });
        }

        const validation = validateMemberInput(memberName, memberEmail);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const templateRecords = await db.select().from(membershipTemplates).where(eq(membershipTemplates.id, Number(templateId))).limit(1);
        if (templateRecords.length === 0) return res.status(404).json({ error: 'Template not found' });
        const template = templateRecords[0];

        const hasAccess = await checkIsClubAdmin(template.clubId);
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        const clubRecords = await db.select().from(clubs).where(eq(clubs.id, template.clubId)).limit(1);
        const club = clubRecords[0];

        // Generate membership number if not provided
        let finalNumber = membershipNumber;
        let finalSlug = slug;
        if (!finalNumber) {
            let isUnique = false;
            let counterOffset = 1;
            const countRecords = await db.select({ count: sql<number>`count(*)` }).from(memberships).where(eq(memberships.clubId, club.id));
            const currentCount = Number(countRecords[0]?.count || 0);

            while (!isUnique) {
                const candidateNumber = generateMembershipNumber(
                    club.membershipNumberFormat,
                    club.slug,
                    template.membershipType,
                    currentCount + counterOffset
                );
                const candidateSlug = slug || `${club.slug}-${candidateNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const collision = await db.select().from(memberships).where(eq(memberships.slug, candidateSlug)).limit(1);
                if (collision.length === 0) {
                    finalNumber = candidateNumber;
                    finalSlug = candidateSlug;
                    isUnique = true;
                } else {
                    counterOffset++;
                }
            }
        } else {
            if (!finalSlug) {
                finalSlug = `${club.slug}-${finalNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            }
        }

        // Verify slug uniqueness
        const collision = await db.select().from(memberships).where(eq(memberships.slug, finalSlug)).limit(1);
        if (collision.length > 0) {
            return res.status(400).json({ error: 'Membership URL slug already in use. Please enter a different one.' });
        }

        const issuedAt = new Date();
        const expiresAt = customExpiresAt ? new Date(customExpiresAt) : new Date();
        if (!customExpiresAt) {
            expiresAt.setMonth(expiresAt.getMonth() + template.durationMonths);
        }

        const [newMembership] = await db.insert(memberships)
            .values({
                templateId: template.id,
                clubId: club.id,
                memberName,
                memberEmail,
                memberPhoto,
                stripImageUrl: stripImageUrl || null,
                membershipNumber: finalNumber,
                membershipType: template.membershipType,
                cardConfig: cardConfig || template.cardConfig,
                memberSince: memberSince ? Number(memberSince) : new Date().getFullYear(),
                slug: finalSlug,
                status: 'active',
                issuedAt,
                expiresAt,
                issuedBy: userId,
            })
            .returning();

        import('./_utils/membership_emails.js').then(({ sendWelcomeEmail }) => {
            sendWelcomeEmail(memberEmail, memberName, club.name, club.slug, finalSlug).catch(e => console.error(e));
        }).catch(e => console.error('Failed to load membership_emails utility', e));

        return res.status(201).json({ success: true, membership: newMembership });
    }

    if (method === 'PUT') {
        const { id, memberName, memberEmail, memberPhoto, stripImageUrl, membershipNumber, slug, cardConfig, status, expiresAt, memberSince } = body;
        if (!id) return res.status(400).json({ error: 'Missing membership ID' });

        const membershipId = Number(id);
        const records = await db.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
        if (records.length === 0) return res.status(404).json({ error: 'Membership not found' });
        const existingMembership = records[0];

        const hasAccess = await checkIsClubAdmin(existingMembership.clubId);

        // Input Validation
        if (memberName !== undefined || memberEmail !== undefined) {
            const nameToValidate = memberName !== undefined ? memberName : existingMembership.memberName;
            const emailToValidate = memberEmail !== undefined ? memberEmail : existingMembership.memberEmail;
            
            const validation = validateMemberInput(nameToValidate, emailToValidate);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
        }

        // Helper to check and cleanup replaced files in R2
        const checkAndCleanupReplacedFiles = async (
            oldPhoto: string | null,
            newPhoto: string | undefined | null,
            oldStrip: string | null,
            newStrip: string | undefined | null
        ) => {
            try {
                const extractR2Key = (urlStr: string | null) => {
                    if (!urlStr) return null;
                    try {
                        const url = new URL(urlStr, 'http://dummy.com');
                        const keyParam = url.searchParams.get('key');
                        if (keyParam) return keyParam;
                        if (url.hostname.includes('r2.dev') || url.hostname.includes('cloudflarestorage')) {
                            return url.pathname.substring(1);
                        }
                    } catch { }
                    return null;
                };

                const keysToDelete: string[] = [];

                if (newPhoto !== undefined && newPhoto !== oldPhoto && oldPhoto) {
                    const key = extractR2Key(oldPhoto);
                    if (key) keysToDelete.push(key);
                }

                if (newStrip !== undefined && newStrip !== oldStrip && oldStrip) {
                    const key = extractR2Key(oldStrip);
                    if (key) keysToDelete.push(key);
                }

                if (keysToDelete.length > 0) {
                    const { deleteFromR2 } = await import('../src/utils/storage.js');
                    for (const key of keysToDelete) {
                        console.log(`[R2-Cleanup] Deleting replaced file key: ${key}`);
                        await deleteFromR2(key).catch(e => console.error(`Failed to delete key ${key}:`, e));
                    }
                }
            } catch (err) {
                console.error('[R2-Cleanup] Error during R2 file cleanup:', err);
            }
        };

        // Role restriction: Member themselves can ONLY update memberPhoto and stripImageUrl
        if (!hasAccess) {
            if (existingMembership.memberEmail !== authenticatedUserEmail) {
                return res.status(403).json({ error: 'Forbidden: Access denied' });
            }

            const oldPhoto = existingMembership.memberPhoto;
            const oldStrip = existingMembership.stripImageUrl;
            const newPhoto = memberPhoto || existingMembership.memberPhoto;
            const newStrip = stripImageUrl || existingMembership.stripImageUrl;

            // Clean up replaced files asynchronously
            checkAndCleanupReplacedFiles(oldPhoto, newPhoto, oldStrip, newStrip);

            // Member updating their own photo
            const [updatedMembership] = await db.update(memberships)
                .set({
                    memberPhoto: newPhoto,
                    stripImageUrl: newStrip,
                    updatedAt: new Date(),
                })
                .where(eq(memberships.id, membershipId))
                .returning();

            await syncMembershipWallet(existingMembership.uid);

            return res.status(200).json({ success: true, membership: updatedMembership });
        }

        // Admin can update everything
        // Verify slug uniqueness if slug is changing
        if (slug && slug !== existingMembership.slug) {
            const collision = await db.select().from(memberships).where(eq(memberships.slug, slug)).limit(1);
            if (collision.length > 0) {
                return res.status(400).json({ error: 'Membership slug already in use' });
            }
        }

        // Clean up replaced files asynchronously
        checkAndCleanupReplacedFiles(
            existingMembership.memberPhoto,
            memberPhoto,
            existingMembership.stripImageUrl,
            stripImageUrl
        );

        const [updatedMembership] = await db.update(memberships)
            .set({
                memberName,
                memberEmail,
                memberPhoto,
                stripImageUrl,
                membershipNumber,
                slug,
                cardConfig,
                memberSince: memberSince !== undefined ? (memberSince ? Number(memberSince) : null) : undefined,
                status,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(memberships.id, membershipId))
            .returning();

        await syncMembershipWallet(existingMembership.uid);

        return res.status(200).json({ success: true, membership: updatedMembership });
    }

    if (method === 'DELETE') {
        const id = Number(query.id);
        if (!id) return res.status(400).json({ error: 'Missing membership ID' });

        const records = await db.select().from(memberships).where(eq(memberships.id, id)).limit(1);
        if (records.length === 0) return res.status(404).json({ error: 'Membership not found' });
        const existingMembership = records[0];

        const hasAccess = await checkIsClubAdmin(existingMembership.clubId);
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        // Scrub & Hide Deletion
        const { deleteFromR2 } = await import('../src/utils/storage.js');
        
        // 1. Delete R2 Images
        try {
            const extractR2Key = (urlStr: string | null) => {
                if (!urlStr) return null;
                try {
                    const url = new URL(urlStr, 'http://dummy.com');
                    const keyParam = url.searchParams.get('key');
                    if (keyParam) return keyParam;
                    if (url.hostname.includes('r2.dev') || url.hostname.includes('cloudflarestorage')) {
                        return url.pathname.substring(1);
                    }
                } catch { }
                return null;
            };

            const photoKey = extractR2Key(existingMembership.memberPhoto);
            if (photoKey) await deleteFromR2(photoKey);

            const stripKey = extractR2Key(existingMembership.stripImageUrl);
            if (stripKey) await deleteFromR2(stripKey);
        } catch (e) {
            console.error('Failed to delete R2 images during member deletion:', e);
        }

        // 2. Scrub Personal Data & set status to 'revoked'
        const [revokedMembership] = await db.update(memberships)
            .set({ 
                memberName: 'Deleted Member',
                memberEmail: 'deleted@example.com',
                memberPhoto: null,
                stripImageUrl: null,
                status: 'revoked', 
                updatedAt: new Date() 
            })
            .where(eq(memberships.id, id))
            .returning();

        // 3. Trigger Apple Wallet Sync to push the voided/scrubbed pass to phones
        await syncMembershipWallet(existingMembership.uid);

        return res.status(200).json({ success: true, membership: revokedMembership, message: 'Member deleted, data scrubbed, and pass revoked' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
