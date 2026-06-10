import { db } from '../src/db/index.js';
import { clubs, membershipTemplates, memberships, clubAdmins, users, walletPushRegistrations } from '../src/db/schema.js';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { checkRateLimit, validatePayload } from './_utils/security.js';

export function normalizeR2Url(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.includes('.r2.dev/')) {
        const parts = url.split('.r2.dev/');
        if (parts.length > 1) {
            return `/api/public?resource=asset&key=${parts[1]}`;
        }
    }
    return url;
}

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
        console.log(`[APNs-Membership] Pushed updates to ${successCount}/${devices.length} devices for membership UID ${membershipUid}`);
    } catch (err) {
        console.error('[APNs-Membership] Sync error:', err);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
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

    const authBypass = process.env.CLERK_BYPASS_AUTH === 'true';

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
            isSuperUser = clerkUser.publicMetadata?.role === 'admin';
        } catch (err) {
            console.error('[Clerk-Auth-Membership] Verification failed:', err);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    }

    // Helper: Check if user is admin of a specific club
    const checkIsClubAdmin = async (clubId: number): Promise<boolean> => {
        if (isSuperUser) return true;
        const adminCheck = await db.select()
            .from(clubAdmins)
            .where(and(eq(clubAdmins.clerkId, authenticatedUserId), eq(clubAdmins.clubId, clubId)))
            .limit(1);
        return adminCheck.length > 0;
    };

    try {
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
        console.error('Membership API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error?.message });
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

            return res.status(200).json({ success: true, club, admins });
        }

        // List clubs
        if (isSuperUser) {
            // Super User gets everything
            const allClubs = await db.select().from(clubs).orderBy(desc(clubs.createdAt));
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
                createdAt: clubs.createdAt,
            })
            .from(clubs)
            .innerJoin(clubAdmins, eq(clubAdmins.clubId, clubs.id))
            .where(eq(clubAdmins.clerkId, userId))
            .orderBy(desc(clubs.createdAt));

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

            // Insert admins if provided
            if (Array.isArray(admins) && admins.length > 0) {
                for (const clerkId of admins) {
                    await tx.insert(clubAdmins).values({
                        clubId: newClub.id,
                        clerkId,
                        role: 'admin',
                    });
                }
            }

            return newClub;
        });

        return res.status(201).json({ success: true, club: result });
    }

    if (method === 'PUT') {
        const { id, name, slug, logoUrl, brandingConfig, membershipNumberFormat, admins } = body;
        if (!id) return res.status(400).json({ error: 'Missing club ID' });

        const hasAccess = await checkIsClubAdmin(Number(id));
        if (!hasAccess) return res.status(403).json({ error: 'Forbidden: Access denied' });

        const clubId = Number(id);

        // Update in transaction
        const result = await db.transaction(async (tx) => {
            const [updatedClub] = await tx.update(clubs)
                .set({
                    name,
                    slug,
                    logoUrl,
                    brandingConfig,
                    membershipNumberFormat,
                    updatedAt: new Date(),
                })
                .where(eq(clubs.id, clubId))
                .returning();

            // Admin updates (Super User only)
            if (isSuperUser && Array.isArray(admins)) {
                // Remove existing admins and re-insert
                await tx.delete(clubAdmins).where(eq(clubAdmins.clubId, clubId));
                for (const clerkId of admins) {
                    await tx.insert(clubAdmins).values({
                        clubId,
                        clerkId,
                        role: 'admin',
                    });
                }
            }

            return updatedClub;
        });

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
        // Super user only can create templates
        if (!isSuperUser) return res.status(403).json({ error: 'Forbidden: Super User access required' });

        const { clubId, name, membershipType, cardConfig, durationMonths, isActive } = body;
        if (!clubId || !name || !membershipType || !cardConfig) {
            return res.status(400).json({ error: 'Missing required fields' });
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
        if (!isSuperUser) return res.status(403).json({ error: 'Forbidden: Super User access required' });

        const { id, name, membershipType, cardConfig, durationMonths, isActive } = body;
        if (!id) return res.status(400).json({ error: 'Missing template ID' });

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
        if (!isSuperUser) return res.status(403).json({ error: 'Forbidden: Super User access required' });
        const id = Number(query.id);
        if (!id) return res.status(400).json({ error: 'Missing template ID' });

        await db.delete(membershipTemplates).where(eq(membershipTemplates.id, id));
        return res.status(200).json({ success: true, message: 'Template deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// ==========================================
// MEMBERSHIPS RESOURCE HANDLERS
// ==========================================

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

        // A. BULK INSERTION
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
                    const { name, email, photoUrl, membershipType, membershipNumber, slug } = row;
                    if (!name || !email) {
                        results.push({ name, email, success: false, error: 'Name and Email are required' });
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
                            const candidateNumber = club.membershipNumberFormat.replace('{NUMBER}', String(currentCount + counterOffset).padStart(3, '0'));
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

            return res.status(200).json({ success: true, results });
        }

        // B. SINGLE CARD CREATION
        const { templateId, memberName, memberEmail, memberPhoto, membershipNumber, slug, cardConfig, expiresAt: customExpiresAt } = body;
        if (!templateId || !memberName || !memberEmail) {
            return res.status(400).json({ error: 'Missing required fields: templateId, memberName, memberEmail' });
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
                const candidateNumber = club.membershipNumberFormat.replace('{NUMBER}', String(currentCount + counterOffset).padStart(3, '0'));
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
                membershipNumber: finalNumber,
                membershipType: template.membershipType,
                cardConfig: cardConfig || template.cardConfig,
                slug: finalSlug,
                status: 'active',
                issuedAt,
                expiresAt,
                issuedBy: userId,
            })
            .returning();

        return res.status(201).json({ success: true, membership: newMembership });
    }

    if (method === 'PUT') {
        const { id, memberName, memberEmail, memberPhoto, stripImageUrl, membershipNumber, slug, cardConfig, status, expiresAt } = body;
        if (!id) return res.status(400).json({ error: 'Missing membership ID' });

        const membershipId = Number(id);
        const records = await db.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
        if (records.length === 0) return res.status(404).json({ error: 'Membership not found' });
        const existingMembership = records[0];

        const hasAccess = await checkIsClubAdmin(existingMembership.clubId);

        // Role restriction: Member themselves can ONLY update memberPhoto and stripImageUrl
        if (!hasAccess) {
            if (existingMembership.memberEmail !== authenticatedUserEmail) {
                return res.status(403).json({ error: 'Forbidden: Access denied' });
            }

            // Member updating their own photo
            const [updatedMembership] = await db.update(memberships)
                .set({
                    memberPhoto: memberPhoto || existingMembership.memberPhoto,
                    stripImageUrl: stripImageUrl || existingMembership.stripImageUrl,
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

        const [updatedMembership] = await db.update(memberships)
            .set({
                memberName,
                memberEmail,
                memberPhoto,
                stripImageUrl,
                membershipNumber,
                slug,
                cardConfig,
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

        // Revoke: Update status to 'revoked'
        const [revokedMembership] = await db.update(memberships)
            .set({ status: 'revoked', updatedAt: new Date() })
            .where(eq(memberships.id, id))
            .returning();

        await syncMembershipWallet(existingMembership.uid);

        return res.status(200).json({ success: true, membership: revokedMembership, message: 'Membership status set to revoked' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
