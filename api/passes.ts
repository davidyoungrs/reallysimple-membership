import { db } from '../src/db/index.js';
import { businessCards, users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, validatePayload } from './_utils/security.js';

// export const config = {
//     runtime: 'edge', // Only if appropriate. Usually Node is safer for file ops.
// };

// Use process.cwd() to locate certs in Vercel environment
const CERT_DIR = path.join(process.cwd(), 'certs');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const type = req.query.type as string; // 'apple' or 'google'
    const slug = req.query.slug as string;

    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    if (!type) return res.status(400).json({ error: 'Missing type (apple or google)' });

    if (type === 'apple') {
        return await handleApplePass(req, res, slug);
    } else if (type === 'google') {
        return await handleGooglePass(req, res, slug);
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }
}

// --- HANDLERS ---

export async function handleApplePass(req: VercelRequest, res: VercelResponse, slug: string) {
    try {
        console.log(`[PassGen] Generating Apple Pass for slug: ${slug}`);

        const results = await db.select({
            card: businessCards,
            user: users
        })
            .from(businessCards)
            .leftJoin(users, eq(businessCards.userId, users.clerkId))
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (results.length === 0) return res.status(404).send('Card not found');

        const { card, user } = results[0];
        const { getEffectiveTier, applyTierLimits } = await import('../src/utils/tier-limits.js');

        // Allow simulator overrides for testing
        const simStatus = req.query.sim_status as string;
        const simTier = req.query.sim_tier as string;

        const effectiveTier = getEffectiveTier({
            tier: (simTier as any) || (user?.tier as any) || 'starter',
            status: (simStatus as any) || (user?.subscriptionStatus as any),
            currentPeriodEnd: user?.currentPeriodEnd ?? null
        });

        const data = applyTierLimits(card.data as any, effectiveTier);

        const teamId = process.env.APPLE_TEAM_ID;
        const passTypeId = process.env.APPLE_PASS_TYPE_ID;

        if (!teamId || !passTypeId) {
            console.error('[PassGen] Missing APPLE_TEAM_ID or APPLE_PASS_TYPE_ID');
            return res.status(500).json({ error: 'Server configuration error: Missing Apple IDs' });
        }

        const getCertContent = (envVar: string, fileName: string) => {
            if (process.env[envVar]) return process.env[envVar]!.replace(/\\n/g, '\n');
            const localPath = path.join(CERT_DIR, fileName);
            if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8');
            return null;
        };

        const certs = {
            wwdr: getCertContent('WALLET_WWDR_CERT', 'wwdr.pem'),
            signerCert: getCertContent('WALLET_SIGNER_CERT', 'signerCert.pem'),
            signerKey: getCertContent('WALLET_SIGNER_KEY', 'signerKey.pem'),
        };

        if (!certs.wwdr || !certs.signerCert || !certs.signerKey) {
            return res.status(500).json({ error: 'Missing certificates' });
        }

        const modelPath = path.join(process.cwd(), 'certs', 'model.pass');
        if (!fs.existsSync(modelPath)) {
            console.error(`[PassGen] model.pass not found at: ${modelPath}`);
            return res.status(500).json({ error: 'Model.pass not found' });
        }

        const host = req.headers.host || 'reallysimple-new.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';

        const pass = await PKPass.from(
            { model: modelPath, certificates: certs as any },
            {
                serialNumber: card.uid,
                webServiceURL: `${protocol}://${host}/api`, // Apple appends /v1/passes or /v1/devices automatically
                authenticationToken: Buffer.from(card.uid).toString('base64'),
                description: effectiveTier === 'starter' ? 'Digital Card - Subscription Lapsed' : 'Digital Business Card',
                logoText: effectiveTier === 'starter' ? 'SUBSCRIPTION LAPSED' : (data.wallet?.showLogoText === false ? ' ' : (data.wallet?.logoText || data.company || 'Digital Card')),
                organizationName: data.company || 'Contact Tree',
                passTypeIdentifier: passTypeId,
                teamIdentifier: teamId,
                backgroundColor: data.wallet?.backgroundColor || 'rgb(255,255,255)',
                foregroundColor: data.wallet?.foregroundColor || 'rgb(0,0,0)',
                labelColor: data.wallet?.labelColor || 'rgb(0,0,0)',
                voided: effectiveTier === 'starter'
            }
        );

        if (user && user.tier !== 'grandfathered' && user.tier !== 'business' && user.currentPeriodEnd) {
            (pass as any).setExpirationDate(user.currentPeriodEnd);
        }

        pass.type = 'storeCard';

        // Add Logic for Images (Logo, Strip)
        const addImage = async (url: string | undefined, name: string) => {
            if (!url) return;
            try {
                if (url.startsWith('/')) {
                    const publicPath = path.join(process.cwd(), 'public', url);
                    if (fs.existsSync(publicPath)) {
                        const buffer = fs.readFileSync(publicPath);
                        pass.addBuffer(name, buffer);
                        // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                } else if (url.startsWith('data:image')) {
                    const buffer = Buffer.from(url.split(',')[1], 'base64');
                    pass.addBuffer(name, buffer);
                    // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                    if (name === 'logo.png') {
                        pass.addBuffer('logo@2x.png', buffer);
                        pass.addBuffer('logo@3x.png', buffer);
                    }
                } else if (url.startsWith('http')) {
                    const response = await fetch(url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        pass.addBuffer(name, buffer);
                        // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to add image ${name}:`, err);
            }
        };

        await addImage(data.wallet?.logoUrl || data.logoUrl, 'logo.png');
        if (data.wallet?.showStripImage !== false) {
            await addImage(data.wallet?.stripImageUrl || '/wallet-strip.png', 'strip.png');
        }

        // --- FIELD POPULATION ---
        if (effectiveTier !== 'starter') {
            // Fields (Main)
            if (data.wallet?.showNameFields !== false && !data.wallet?.hideStripText) {
                pass.primaryFields.push({ key: 'name', label: 'Name', value: data.fullName || 'Your Name' });
            }

            if (data.jobTitle && data.wallet?.showRole !== false) {
                pass.secondaryFields.push({ key: 'role', label: 'Role', value: data.jobTitle });
            }
            if (data.company && data.wallet?.showCompany !== false) {
                pass.secondaryFields.push({ key: 'company', label: 'Company', value: data.company });
            }

            // Back Fields
            const publicCardUrl = `${protocol}://${host}/card/${slug}`;
            pass.backFields.push({ key: 'card-url', label: 'My Digital Card', value: 'Open Card', attributedValue: `<a href="${publicCardUrl}">Open Card</a>` } as any);

            if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
                data.phoneNumbers.forEach((phone: any, index: number) => {
                    pass.backFields.push({ key: `phone-${index}`, label: phone.label || 'Phone', value: phone.number });
                });
            }

            if (data.socialLinks && Array.isArray(data.socialLinks)) {
                data.socialLinks.forEach((link: any, index: number) => {
                    let label = (link.label || link.platform);
                    label = label.charAt(0).toUpperCase() + label.slice(1);
                    let value = link.url;
                    let attributedValue = undefined;

                    if (link.platform === 'email') value = value.replace('mailto:', '');
                    else if (link.platform === 'phone') value = value.replace('tel:', '');
                    else {
                        let href = value;
                        if (!href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel')) href = `https://${href}`;
                        attributedValue = `<a href="${href}">Link</a>`;
                        value = 'Link';
                    }
                    pass.backFields.push({ key: `social-${index}`, label, value, attributedValue } as any);
                });
            }
        } else {
            // Voided Pass Content
            pass.primaryFields.push({ key: 'status', label: 'OFFLINE', value: 'Reactivate via App' });
            pass.backFields.push({
                key: 'help',
                label: 'Why is this card inactive?',
                value: 'Your subscription has lapsed. Scan the QR code or visit our website to reactivate.'
            });
            // Override visibility for voided passes
            (pass as any).logoText = 'SUBSCRIPTION LAPSED';
        }

        // Barcode / QR Logic
        const publicCardUrl = `${protocol}://${host}/card/${slug}`;
        const qrUrl = effectiveTier === 'starter'
            ? `${protocol}://${host}/lapsed`
            : `${publicCardUrl}?src=wallet`;

        pass.setBarcodes({
            format: 'PKBarcodeFormatQR',
            message: qrUrl,
            messageEncoding: 'utf-8'
        });

        console.log('Generating pass buffer...');
        const buffer = pass.getAsBuffer();

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=${slug}.pkpass`);

        // To ensure Apple Wallet accepts this pass, the `last-modified` header MUST be >= the tag 
        // returned in the registrations endpoint. Since tier changes don't update `card.updatedAt`, 
        // we pull the exact `updatedAt` from the walletPushRegistrations table which is bumped during pushes.
        const { walletPushRegistrations } = await import('../src/db/schema.js');
        const reg = await db.select({ updatedAt: walletPushRegistrations.updatedAt })
            .from(walletPushRegistrations)
            .where(eq(walletPushRegistrations.serialNumber, card.uid))
            .limit(1);

        let lastUpdatedObj = new Date();
        if (reg.length > 0 && reg[0].updatedAt) {
            lastUpdatedObj = reg[0].updatedAt;
        } else if (card.updatedAt) {
            lastUpdatedObj = new Date(card.updatedAt);
        }

        const lastUpdated = lastUpdatedObj.toISOString().split('.')[0] + 'Z';
        res.setHeader('last-modified', lastUpdated);
        return res.status(200).send(buffer);

    } catch (error: any) {
        console.error('Apple Pass Error:', error);
        return res.status(500).json({ error: 'Failed to generate pass', details: error.message });
    }
}

async function handleGooglePass(req: VercelRequest, res: VercelResponse, slug: string) {
    const GOOGLE_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_ISSUER_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error("Missing Google Wallet credentials");
        return res.status(500).json({ error: 'Missing server configuration (Google Wallet)' });
    }

    // CORS headers for Google Pay Button interaction if needed
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        console.log(`[PassGen] Generating Google Pass for slug: ${slug}`);
        const results = await db.select({
            cardRecord: businessCards,
            user: users
        })
            .from(businessCards)
            .leftJoin(users, eq(businessCards.userId, users.clerkId))
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (!results.length) return res.status(404).json({ error: 'Card not found' });

        const { cardRecord, user } = results[0];
        const { getEffectiveTier, applyTierLimits } = await import('../src/utils/tier-limits.js');

        // Allow simulator overrides for testing
        const simStatus = req.query.sim_status as string;
        const simTier = req.query.sim_tier as string;

        const effectiveTier = getEffectiveTier({
            tier: (simTier as any) || (user?.tier as any) || 'starter',
            status: (simStatus as any) || (user?.subscriptionStatus as any),
            currentPeriodEnd: user?.currentPeriodEnd ?? null
        });

        const card = applyTierLimits(cardRecord.data as any, effectiveTier);

        const classId = `${GOOGLE_ISSUER_ID}.contact-tree-standard-v3`;
        const objectId = `${GOOGLE_ISSUER_ID}.${slug.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`; // Stable ID for auto-syncing

        // Force Production URL for Google to reach images
        const baseUrl = 'https://reallysimple-new.vercel.app';

        const toAbsoluteUrl = (url: string) => {
            if (!url || url.startsWith('data:')) return '';
            if (url.startsWith('http')) return url;
            return new URL(url, baseUrl).toString();
        };

        // Helper to find first non-data-uri logo
        const getValidUrl = (preferred: string | undefined, secondary: string | undefined, fallback: string) => {
            if (preferred && !preferred.startsWith('data:')) return toAbsoluteUrl(preferred);
            if (secondary && !secondary.startsWith('data:')) return toAbsoluteUrl(secondary);
            return toAbsoluteUrl(fallback);
        };

        const logoUrl = getValidUrl(card.wallet?.logoUrl, card.logoUrl, '/icon.png');
        const heroUrl = getValidUrl(card.wallet?.stripImageUrl, '/wallet-strip.png', '/wallet-strip.png');

        if (card.wallet?.logoUrl?.startsWith('data:')) {
            console.warn(`[PassGen] Google Wallet does not support data URIs. Falling back for logo.`);
        }
        const title = (card.wallet?.logoText || card.company || 'Digital Card').substring(0, 50);
        const headerValue = (card.wallet?.showNameFields !== false && !card.wallet?.hideStripText) ? (card.fullName || 'Digital Card').substring(0, 50) : ' ';

        const subheaderParts = [];
        if (card.wallet?.showRole !== false && card.jobTitle && !card.wallet?.hideStripText) subheaderParts.push(card.jobTitle);
        if (card.wallet?.showCompany !== false && card.company && !card.wallet?.hideStripText) subheaderParts.push(card.company);
        const subheaderValue = subheaderParts.join(' | ').substring(0, 50) || ' ';

        const textModules: any[] = [
            { header: 'Phone', body: card.phoneNumbers?.[0]?.number || '', id: 'phone' },
            { header: 'Email', body: card.socialLinks?.find((l: any) => l.platform === 'email')?.url.replace('mailto:', '') || user?.email || '', id: 'email' },
            { header: 'Website', body: `https://contact-tree.vercel.app/card/${slug}`, id: 'website' }
        ];

        // Add additional phone numbers
        if (card.phoneNumbers && card.phoneNumbers.length > 1) {
            card.phoneNumbers.slice(1).forEach((p: any, i: number) => {
                textModules.push({ header: p.label || `Phone ${i + 2}`, body: p.number, id: `phone_${p.id}` });
            });
        }

        // Add social links
        if (card.socialLinks && Array.isArray(card.socialLinks)) {
            card.socialLinks.forEach((link: any) => {
                if (link.url) {
                    textModules.push({
                        header: link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
                        body: link.url,
                        id: `social_${link.id}`
                    });
                }
            });
        }

        const newPass = {
            iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            payload: {
                genericObjects: [{
                    id: objectId,
                    classId: classId,
                    ...(user?.currentPeriodEnd && user.tier !== 'grandfathered' && user.tier !== 'business' ? {
                        validTimeInterval: {
                            end: {
                                date: {
                                    year: user.currentPeriodEnd.getFullYear(),
                                    month: user.currentPeriodEnd.getMonth() + 1,
                                    day: user.currentPeriodEnd.getDate(),
                                    hours: user.currentPeriodEnd.getHours(),
                                    minutes: user.currentPeriodEnd.getMinutes(),
                                    seconds: user.currentPeriodEnd.getSeconds()
                                }
                            }
                        }
                    } : {}),
                    genericType: 'GENERIC_TYPE_UNSPECIFIED',
                    hexBackgroundColor: card.wallet?.backgroundColor || card.themeColor || '#4f46e5',
                    logo: {
                        sourceUri: { uri: logoUrl },
                        contentDescription: { defaultValue: { language: 'en-US', value: 'LOGO' } }
                    },
                    ...(card.wallet?.showStripImage !== false ? {
                        heroImage: {
                            sourceUri: { uri: heroUrl },
                            contentDescription: { defaultValue: { language: 'en-US', value: 'HERO' } }
                        }
                    } : {}),
                    cardTitle: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'SUBSCRIPTION LAPSED' : title } },
                    header: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'INACTIVE' : headerValue } },
                    subheader: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'Reactivate via app' : subheaderValue } },
                    state: effectiveTier === 'starter' ? 'expired' : 'active',
                    textModulesData: effectiveTier === 'starter' ? [] : textModules.slice(0, 10), // Limit to 10 modules
                    barcode: {
                        type: 'QR_CODE',
                        value: effectiveTier === 'starter' ? `${baseUrl}/lapsed` : `${baseUrl}/card/${slug}`,
                        alternateText: effectiveTier === 'starter' ? 'SCAN TO REACTIVATE' : 'Scan to View'
                    }
                }],
                // Define class inline for statelessness
                genericClasses: [{
                    id: classId,
                    classTemplateInfo: {
                        cardTemplateOverride: {
                            cardRowTemplateInfos: [
                                { twoItems: { startItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["phone"]' }] } }, endItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["email"]' }] } } } },
                                { oneItem: { item: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["website"]' }] } } } }
                            ]
                        }
                    }
                }]
            }
        };

        if (!jwt || !jwt.sign) {
            throw new Error('Internal Server Error: JWT library issue');
        }

        const token = jwt.sign(newPass, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return res.status(200).json({ saveUrl });

    } catch (error: any) {
        console.error('Google Pass Error:', error);
        return res.status(500).json({ error: 'Failed to generate Google pass', details: error.message });
    }
}
